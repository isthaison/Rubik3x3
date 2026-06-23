import { CubeColor } from '../types';

// Target default colors of a standard Rubik's cube for backup distance comparison
export const REF_COLORS: Record<CubeColor, { r: number; g: number; b: number }> = {
  white: { r: 235, g: 235, b: 235 },
  yellow: { r: 215, g: 215, b: 0 },
  green: { r: 0, g: 170, b: 60 },
  blue: { r: 0, g: 85, b: 210 },
  orange: { r: 245, g: 115, b: 0 },
  red: { r: 215, g: 5, b: 15 },
};

/**
 * Helper class representing the logic analyzer for scanning Rubik's Cube
 */
export class CubeScannerDetector {
  /**
   * Convert RGB to HSV for precise chrominance classification
   */
  public static rgbToHsv(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const v = max;

    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 360, s, v };
  }

  /**
   * Advanced color classifier using Hue coordinates
   */
  public static classifyColor(r: number, g: number, b: number): CubeColor {
    const { h, s, v } = this.rgbToHsv(r, g, b);
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const chromaRange = maxVal - minVal;

    // 1. Detect White: Must be extremely neutral under normal-to-bright lighting.
    // If there is glare on colored stickers, chromaRange remains high (biased), while true white is very uniform.
    if (v >= 0.12) {
      if (s < 0.14 || (chromaRange < 24 && s < 0.22)) {
        return 'white';
      }
    } else {
      return 'white'; // Low lighting fallback
    }

    // 2. Classify by Hue angles (0 - 360 degrees)
    if (h >= 345 || h < 14) {
      if (h >= 10 || (g > 75 && s < 0.85)) {
        return 'orange';
      }
      return 'red';
    } else if (h >= 14 && h < 42) {
      return 'orange';
    } else if (h >= 42 && h < 68) {
      if (v < 0.4 && s < 0.5) {
        return 'white';
      }
      return 'yellow';
    } else if (h >= 68 && h < 165) {
      return 'green';
    } else if (h >= 165 && h < 265) {
      return 'blue';
    } else {
      return 'red';
    }
  }

  /**
   * Fallback classic Euclidean Distance Classifier to optimize near colors
   */
  public static classifyColorDistance(r: number, g: number, b: number): CubeColor {
    let bestColor: CubeColor = 'white';
    let minDistance = Infinity;

    for (const [colorName, ref] of Object.entries(REF_COLORS)) {
      const dist = Math.sqrt(
        Math.pow(r - ref.r, 2) + Math.pow(g - ref.g, 2) + Math.pow(b - ref.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestColor = colorName as CubeColor;
      }
    }
    return bestColor;
  }

  /**
   * Hybrid voting classifier for maximum real-world reliability
   */
  public static getScannedColor(r: number, g: number, b: number): CubeColor {
    const fromHsv = this.classifyColor(r, g, b);
    const fromDistance = this.classifyColorDistance(r, g, b);

    if (fromHsv === fromDistance) {
      return fromHsv;
    }

    // If HSV detected a specific color, but Distance classifier fell back to white due to high brightness/glare,
    // we MUST trust the Hue-based HSV classifier (since glare washes out RGB Euclidean distance to white).
    if (fromDistance === 'white' && fromHsv !== 'white') {
      return fromHsv;
    }

    // Default to fromHsv as it is extremely robust to lighting variations,
    // unless distance classifier helps refine red vs orange.
    if ((fromHsv === 'red' || fromHsv === 'orange') && (fromDistance === 'red' || fromDistance === 'orange')) {
      return fromDistance;
    }

    // Otherwise, prefer fromHsv as it is more robust to general lighting shifts
    return fromHsv;
  }

  /**
   * Evaluates if a valid rubik's cube face is captured inside the specified view coordinates.
   * Leverages 12-point spacer/border contrast analysis, high saturation validation, 
   * and multi-factor confidence scoring for maximum real-world reliability.
   */
  public static analyzeCubePresence(
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    step: number,
    sampledColors: CubeColor[],
    totalStickerBrightness: number
  ): { isCubeFaceDetected: boolean; detectionConfidence: number } {
    // 1. Sample 12 intermediate border points situated precisely in the black grid lines between the 9 stickers
    const borderSamples = [
      // Vertical line 1: between column 1 and column 2 (x = startX + step)
      { x: startX + step, y: startY + Math.round(step / 2) },
      { x: startX + step, y: startY + Math.round(3 * step / 2) },
      { x: startX + step, y: startY + Math.round(5 * step / 2) },

      // Vertical line 2: between column 2 and column 3 (x = startX + 2 * step)
      { x: startX + 2 * step, y: startY + Math.round(step / 2) },
      { x: startX + 2 * step, y: startY + Math.round(3 * step / 2) },
      { x: startX + 2 * step, y: startY + Math.round(5 * step / 2) },

      // Horizontal line 1: between row 1 and row 2 (y = startY + step)
      { x: startX + Math.round(step / 2), y: startY + step },
      { x: startX + Math.round(3 * step / 2), y: startY + step },
      { x: startX + Math.round(5 * step / 2), y: startY + step },

      // Horizontal line 2: between row 2 and row 3 (y = startY + 2 * step)
      { x: startX + Math.round(step / 2), y: startY + 2 * step },
      { x: startX + Math.round(3 * step / 2), y: startY + 2 * step },
      { x: startX + Math.round(5 * step / 2), y: startY + 2 * step }
    ];

    let totalBorderBrightness = 0;
    let borderSampleCount = 0;

    for (const pt of borderSamples) {
      try {
        const imgData = ctx.getImageData(pt.x - 2, pt.y - 2, 4, 4);
        const data = imgData.data;
        let r = 0, g = 0, b = 0, cnt = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          cnt++;
        }
        if (cnt > 0) {
          const rAvg = r / cnt;
          const gAvg = g / cnt;
          const bAvg = b / cnt;
          // Calculate perceptual brightness (luminance)
          totalBorderBrightness += (0.299 * rAvg + 0.587 * gAvg + 0.114 * bAvg);
          borderSampleCount++;
        }
      } catch (e) {
        // Safe check for canvas bounds
      }
    }

    const avgStickerBright = totalStickerBrightness / 9;
    const avgBorderBright = borderSampleCount > 0 ? (totalBorderBrightness / borderSampleCount) : 0;
    
    // Rubik's cube frames generally consist of black/dark plastic borders resulting in higher sticker-to-border contrast
    const contrastRatio = avgBorderBright > 0 ? (avgStickerBright / Math.max(1, avgBorderBright)) : 1.0;

    // 2. High-Saturation verification of colored stickers (excluding white/yellow fallbacks)
    let highSaturationCount = 0;
    let coloredStickerCount = 0;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = startX + col * step + Math.round(step / 2);
        const cy = startY + row * step + Math.round(step / 2);
        try {
          const imgData = ctx.getImageData(cx - 3, cy - 3, 6, 6);
          const data = imgData.data;
          let r = 0, g = 0, b = 0, cnt = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            cnt++;
          }
          if (cnt > 0) {
            const rAvg = r / cnt;
            const gAvg = g / cnt;
            const bAvg = b / cnt;
            const { s, v } = this.rgbToHsv(rAvg, gAvg, bAvg);
            const classified = this.getScannedColor(rAvg, gAvg, bAvg);

            if (classified !== 'white') {
              coloredStickerCount++;
              if (s > 0.40) { // Rubik's colors are highly saturated
                highSaturationCount++;
              }
            } else {
              // White is verified by high brightness and low saturation
              if (v > 0.45 && s < 0.25) {
                highSaturationCount++;
                coloredStickerCount++;
              }
            }
          }
        } catch (e) {}
      }
    }

    // 3. Multi-Factor Confidence Evaluation Scoring (Max: 100)
    let confidence = 10; // Base baseline

    // Ambient Lighting Factor (Max: 20 points)
    if (avgStickerBright > 55 && avgStickerBright < 240) {
      confidence += 20;
    } else if (avgStickerBright > 35 && avgStickerBright < 252) {
      confidence += 10;
    }

    // Grid Edge Contrast Factor (Max: 35 points)
    if (contrastRatio > 1.15) {
      confidence += 35; // Perfect dark plastic borders
    } else if (contrastRatio > 1.08) {
      confidence += 25;
    } else if (contrastRatio > 1.03) {
      confidence += 12;
    }

    // Color Saliency & Saturation Purity Fit (Max: 25 points)
    const saturationRatio = coloredStickerCount > 0 ? (highSaturationCount / coloredStickerCount) : 1.0;
    if (saturationRatio > 0.75) {
      confidence += 25; // Highly clean Rubik-like color distribution
    } else if (saturationRatio > 0.45) {
      confidence += 15;
    }

    // Palette Color Variety (Max: 10 points)
    const uniqueColorsCount = new Set(sampledColors).size;
    if (uniqueColorsCount >= 2) {
      confidence += 10; // Multiple colors present which is standard for scrambles
    } else {
      confidence += 5; // Unified face
    }

    const detectionConfidence = Math.min(100, Math.max(0, confidence));
    
    // Highly stabilized face presence gate (70% or greater)
    const isCubeFaceDetected = detectionConfidence >= 70;

    return { isCubeFaceDetected, detectionConfidence };
  }
}
