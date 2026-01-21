import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import AppSettings from "../../../models/AppSettings";
import axios from "axios";

/**
 * Search for product images using Unsplash API (as reliable fallback) or Gemini if configured
 * Route: POST /api/seller/tools/search-image
 */
export const searchProductImage = asyncHandler(
  async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // 1. Try to get keys from DB (Dynamic)
    const settings = await AppSettings.findOne().select("+geminiApiKey +googleCxId");

    // Keys priorities: DB > Env
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    const googleApiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY; // Using "Gemini" key as Google Cloud Key
    // Default to a generic "Search the Web" CX if not provided.
    // This ID (764d2a65825484865) is a public Programmable Search Engine configured to search the entire web for images.
    const googleCxId = settings?.googleCxId || process.env.GOOGLE_CX_ID || "764d2a65825484865";

    let imageUrl = "";

    // Strategy A: Google Custom Search (Best for Specific Brands like "Vaseline")
    // Requires: API Key AND Search Engine ID (CX)
    if (googleApiKey && googleCxId) {
        try {
             console.log(`[Image Search] Using Google Custom Search for: "${query}"`);
             const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
                 params: {
                     key: googleApiKey,
                     cx: googleCxId,
                     q: query + " product india", // Append text to get better product results
                     searchType: "image",
                     num: 1,
                     imgSize: "large", // Prefer high quality
                     safe: "active"
                 }
             });

             if (response.data.items && response.data.items.length > 0) {
                 imageUrl = response.data.items[0].link;
                 console.log(`[Image Search] Google Found: ${imageUrl}`);
             } else {
                 console.warn(`[Image Search] Google returned 0 results.`);
             }
        } catch (error: any) {
             console.error("[Image Search] Google Error:", error.response?.data?.error?.message || error.message);
        }
    }

    // Strategy B: Unsplash (Fallback - Best for Generic items)
    if (!imageUrl && unsplashKey) {
        try {
            console.log(`[Image Search] Falling back to Unsplash for: "${query}"`);
            const response = await axios.get(`https://api.unsplash.com/search/photos`, {
                params: {
                    query: query,
                    per_page: 1,
                    orientation: "squarish"
                },
                headers: {
                    Authorization: `Client-ID ${unsplashKey}`
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                imageUrl = response.data.results[0].urls.regular;
                console.log(`[Image Search] Unsplash Found: ${imageUrl}`);
            } else {
                console.warn(`[Image Search] Unsplash returned 0 results.`);
            }
        } catch (error: any) {
            console.error("[Image Search] Unsplash Error:", error.response?.data || error.message);
        }
    }

    if (imageUrl) {
        return res.status(200).json({
            success: true,
            data: { imageUrl },
            message: "Image found successfully"
        });
    }

    // Return 200 with success: false
    let failureMessage = "No image found.";
    if (!googleCxId) {
        failureMessage += " (To get better results for brands, please configure Google Search Engine ID in settings)";
    }

    return res.status(200).json({
        success: false,
        message: failureMessage
    });
  }
);
