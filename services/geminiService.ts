import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

interface GenerateImageOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  style: string;
  age: string;
  dominantColor: string;
  ethnicity: string;
}

// Function to generate the initial image
export async function generateInfluencerImage(options: GenerateImageOptions): Promise<string> {
  const { prompt, aspectRatio, style, age, dominantColor, ethnicity } = options;
  
  try {
    let fullPrompt = `Create a ${style}, ultra-realistic, full-body portrait of a ${ethnicity} AI influencer.`;
    fullPrompt += ` The style should be high-resolution, resembling a professional photograph.`;
    fullPrompt += ` Key details: ${prompt}.`;
    if (age) {
        fullPrompt += ` The influencer should appear to be around ${age} years old.`;
    }
    if (dominantColor) {
        fullPrompt += ` The image's color palette should be dominated by shades of ${dominantColor}.`;
    }
    fullPrompt += ` Focus on realistic skin textures, intricate details, natural lighting, and a compelling pose.`;

    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Image generation failed, no images were returned.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;

  } catch (error) {
    console.error("Error generating image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate influencer image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image generation.");
  }
}

// Interface for inpainting options
interface InpaintImageOptions {
  prompt: string;
  image: string; // Base64 encoded image string
  mask: string;  // Base64 encoded mask string
}

// Function to edit an existing image using a mask (inpainting)
export async function inpaintImage(options: InpaintImageOptions): Promise<string> {
  const { prompt, image, mask } = options;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      image: { imageBytes: image, mimeType: 'image/jpeg' },
      mask: { imageBytes: mask, mimeType: 'image/png' },
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
      },
    } as any);

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Inpainting failed, no images were returned.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;

  } catch (error) {
    console.error("Error inpainting image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to inpaint image: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image inpainting.");
  }
}

// Interface for consistent character generation
export interface GenerateConsistentCharacterOptions {
  prompt: string;
  image: string; // Base64 encoded image string
  aspectRatio: AspectRatio;
}

// Function to generate a new scene with a consistent character
export async function generateConsistentCharacter(options: GenerateConsistentCharacterOptions): Promise<string> {
  const { prompt, image, aspectRatio } = options;

  try {
    const fullPrompt = `Using the provided image as a reference for the character's face and appearance, create a new scene. The character must remain consistent. New scene description: "${prompt}"`;
    
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: fullPrompt,
      image: { imageBytes: image, mimeType: 'image/jpeg' },
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio,
      },
    } as any);

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Consistent character generation failed, no images were returned.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;

  } catch (error)
 {
    console.error("Error generating consistent character with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate consistent character: ${error.message}`);
    }
    throw new Error("An unknown error occurred during consistent character generation.");
  }
}

// Interface for adding text to an image
export interface AddTextToImageOptions {
  prompt: string; // The text to add
  image: string;  // Base64 encoded image string
  language: string;
}

// Function to add text to an image
export async function addTextToImage(options: AddTextToImageOptions): Promise<string> {
  const { prompt, image, language } = options;

  try {
    const fullPrompt = `Seamlessly and realistically integrate the following text onto the image, matching the existing art style, lighting, perspective, and textures. The text should appear as a natural part of the scene, not just an overlay.
Text to add: "${prompt}"
The text is in ${language} language.`;
    
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: fullPrompt,
      image: { imageBytes: image, mimeType: 'image/jpeg' },
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
      },
    } as any);

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("Adding text failed, no images were returned.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;

  } catch (error) {
    console.error("Error adding text to image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to add text to image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while adding text to the image.");
  }
}