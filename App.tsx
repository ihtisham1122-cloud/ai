import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateInfluencerImage, inpaintImage, generateConsistentCharacter, addTextToImage } from './services/geminiService';
import SparkleIcon from './components/icons/SparkleIcon';
import PhotoIcon from './components/icons/PhotoIcon';
import DownloadIcon from './components/icons/DownloadIcon';
import TrashIcon from './components/icons/TrashIcon';
import ResetIcon from './components/icons/ResetIcon';

type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
type AppMode = 'generate' | 'edit';
type EditModeTab = 'inpaint' | 'newScene' | 'addText';

const aspectRatioClasses: Record<AspectRatio, string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
};

// Helper to strip data URL prefix
const getBase64FromDataUrl = (dataUrl: string) => dataUrl.split(',')[1];

const App: React.FC = () => {
  // Core state
  const [mode, setMode] = useState<AppMode>('generate');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Generation controls state
  const [prompt, setPrompt] = useState<string>('A stylish female influencer with vibrant pink hair, standing in a futuristic neon-lit city square at night.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<string>('Photorealistic');
  const [age, setAge] = useState<string>('25');
  const [dominantColor, setDominantColor] = useState<string>('Neon Pink');
  const [ethnicity, setEthnicity] = useState<string>('Caucasian');
  
  // Editing controls state
  const [editModeTab, setEditModeTab] = useState<EditModeTab>('inpaint');
  const [inpaintPrompt, setInpaintPrompt] = useState<string>('');
  const [newScenePrompt, setNewScenePrompt] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [textLanguage, setTextLanguage] = useState<string>('English');
  const [brushSize, setBrushSize] = useState<number>(40);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Refs for canvas and image
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Effect to initialize canvas when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      const setCanvasDimensions = () => {
        if (!imageRef.current) return;
        canvas.width = imageRef.current.clientWidth;
        canvas.height = imageRef.current.clientHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.lineCap = 'round';
          context.strokeStyle = 'white';
          context.lineWidth = brushSize;
          contextRef.current = context;
        }
      }
      
      if(image.complete && image.naturalHeight !== 0) {
        setCanvasDimensions();
      } else {
        image.onload = setCanvasDimensions;
      }
      
      window.addEventListener('resize', setCanvasDimensions);
      return () => {
        window.removeEventListener('resize', setCanvasDimensions);
        if(image) image.onload = null;
      }
    }
  }, [mode, brushSize, imageUrl]);

  // Drawing handlers
  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // API call handlers
  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resultUrl = await generateInfluencerImage({
        prompt,
        aspectRatio,
        style,
        age,
        dominantColor,
        ethnicity
      });
      setImageUrl(resultUrl);
      setMode('edit');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, style, age, dominantColor, ethnicity]);

  const handleApplyInpaint = useCallback(async () => {
    if (!imageUrl || !canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const maskDataUrl = canvasRef.current.toDataURL('image/png');
      const maskBase64 = getBase64FromDataUrl(maskDataUrl);
      const imageBase64 = getBase64FromDataUrl(imageUrl);
      
      const resultUrl = await inpaintImage({
        prompt: inpaintPrompt,
        image: imageBase64,
        mask: maskBase64
      });

      setImageUrl(resultUrl);
      clearCanvas();
      setInpaintPrompt('');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, inpaintPrompt]);

  const handleGenerateNewScene = useCallback(async () => {
    if (!imageUrl) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const imageBase64 = getBase64FromDataUrl(imageUrl);
      const resultUrl = await generateConsistentCharacter({
        prompt: newScenePrompt,
        image: imageBase64,
        aspectRatio: aspectRatio,
      });
      setImageUrl(resultUrl);
      setNewScenePrompt('');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, newScenePrompt, aspectRatio]);

  const handleApplyText = useCallback(async () => {
    if (!imageUrl || !textContent) return;

    setIsLoading(true);
    setError(null);
    try {
        const imageBase64 = getBase64FromDataUrl(imageUrl);
        const resultUrl = await addTextToImage({
            prompt: textContent,
            language: textLanguage,
            image: imageBase64,
        });
        setImageUrl(resultUrl);
        setTextContent('');
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [imageUrl, textContent, textLanguage]);


  // UI action handlers
  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-influencer-${Date.now()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartOver = () => {
    setMode('generate');
    setImageUrl(null);
    setError(null);
    setIsLoading(false);
    setInpaintPrompt('');
    setNewScenePrompt('');
    setTextContent('');
    setTextLanguage('English');
    setEditModeTab('inpaint');
  };

  // Sub-components for better structure
  const GenerationControls = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
          Describe Your Influencer
        </label>
        <textarea
          id="prompt"
          rows={4}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A charismatic influencer with silver hair, wearing a retro-futuristic outfit..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Style */}
        <div>
          <label htmlFor="style" className="block text-sm font-medium text-gray-300 mb-2">Style</label>
          <select id="style" value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500">
            <option>Photorealistic</option>
            <option>Anime</option>
            <option>Fantasy Art</option>
            <option>Cyberpunk</option>
            <option>Vintage</option>
          </select>
        </div>
        {/* Aspect Ratio */}
        <div>
          <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
          <select id="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500">
            <option value="1:1">1:1 (Square)</option>
            <option value="4:3">4:3 (Landscape)</option>
            <option value="3:4">3:4 (Portrait)</option>
            <option value="16:9">16:9 (Widescreen)</option>
            <option value="9:16">9:16 (Story)</option>
          </select>
        </div>
        {/* Age */}
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-300 mb-2">Apparent Age</label>
          <input type="text" id="age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500" placeholder="e.g., 25" />
        </div>
        {/* Dominant Color */}
        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-300 mb-2">Dominant Color</label>
          <input type="text" id="color" value={dominantColor} onChange={(e) => setDominantColor(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500" placeholder="e.g., Electric Blue" />
        </div>
        {/* Ethnicity */}
        <div className="md:col-span-2">
            <label htmlFor="ethnicity" className="block text-sm font-medium text-gray-300 mb-2">Ethnicity</label>
            <select id="ethnicity" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500">
                <option>Caucasian</option>
                <option>African</option>
                <option>Asian</option>
                <option>Hispanic</option>
                <option>Middle Eastern</option>
                <option>Native American</option>
            </select>
        </div>
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        <SparkleIcon className="w-5 h-5" />
        {isLoading ? 'Generating...' : 'Generate Influencer'}
      </button>
    </div>
  );

  const ImageDisplay = () => (
    <div className={`relative w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shadow-lg ${aspectRatioClasses[aspectRatio]}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20 text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
          <p className="text-lg">Creating magic...</p>
        </div>
      )}
      {!imageUrl && !isLoading && (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
          <PhotoIcon className="w-16 h-16" />
          <p className="mt-2">Your AI influencer will appear here</p>
        </div>
      )}
      {imageUrl && (
        <>
          <img ref={imageRef} src={imageUrl} alt="Generated AI Influencer" className="w-full h-full object-contain" crossOrigin="anonymous"/>
          {mode === 'edit' && editModeTab === 'inpaint' && (
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair z-10"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
            />
          )}
        </>
      )}
    </div>
  );

  const EditingControls = () => (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button onClick={() => setEditModeTab('inpaint')} className={`py-2 px-4 font-medium ${editModeTab === 'inpaint' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'}`}>Inpaint</button>
        <button onClick={() => setEditModeTab('newScene')} className={`py-2 px-4 font-medium ${editModeTab === 'newScene' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'}`}>New Scene</button>
        <button onClick={() => setEditModeTab('addText')} className={`py-2 px-4 font-medium ${editModeTab === 'addText' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-white'}`}>Add Text</button>
      </div>

      {/* Inpaint Controls */}
      {editModeTab === 'inpaint' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-gray-400 text-sm">Draw a mask on the image where you want to make changes, then describe the edit.</p>
          <div>
            <label htmlFor="inpaint-prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe Your Edit</label>
            <input
              id="inpaint-prompt"
              type="text"
              value={inpaintPrompt}
              onChange={(e) => setInpaintPrompt(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500"
              placeholder="e.g., 'add sunglasses', 'change hair to blue'"
            />
          </div>
          <div>
            <label htmlFor="brush-size" className="block text-sm font-medium text-gray-300 mb-2">Brush Size: {brushSize}px</label>
            <input
              id="brush-size"
              type="range"
              min="10"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleApplyInpaint} disabled={isLoading || !inpaintPrompt} className="flex-grow flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
              <SparkleIcon className="w-5 h-5"/> Apply Edit
            </button>
            <button onClick={clearCanvas} title="Clear Mask" className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white"><TrashIcon/></button>
          </div>
        </div>
      )}

      {/* New Scene Controls */}
      {editModeTab === 'newScene' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-gray-400 text-sm">Describe a new scene or outfit. The AI will try to keep the character's face consistent.</p>
          <div>
            <label htmlFor="new-scene-prompt" className="block text-sm font-medium text-gray-300 mb-2">Describe New Scene</label>
            <textarea
              id="new-scene-prompt"
              rows={3}
              value={newScenePrompt}
              onChange={(e) => setNewScenePrompt(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
              placeholder="e.g., 'At a coffee shop, holding a latte', 'wearing a medieval knight armor'"
            />
          </div>
          <button onClick={handleGenerateNewScene} disabled={isLoading || !newScenePrompt} className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed">
            <SparkleIcon className="w-5 h-5"/> Generate New Scene
          </button>
        </div>
      )}

      {/* Add Text Controls */}
      {editModeTab === 'addText' && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-gray-400 text-sm">Describe the text to add and select its language. The AI will integrate it into the image.</p>
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium text-gray-300 mb-2">Text to Add</label>
            <input
              id="text-content"
              type="text"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500"
              placeholder="e.g., 'Summer Vibes', 'こんにちは'"
            />
          </div>
          <div>
            <label htmlFor="text-language" className="block text-sm font-medium text-gray-300 mb-2">Language</label>
            <select
              id="text-language"
              value={textLanguage}
              onChange={(e) => setTextLanguage(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-pink-500 focus:border-pink-500"
            >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
              <option>Japanese</option>
              <option>Korean</option>
              <option>Chinese</option>
              <option>Russian</option>
              <option>Arabic</option>
            </select>
          </div>
          <button
            onClick={handleApplyText}
            disabled={isLoading || !textContent}
            className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <SparkleIcon className="w-5 h-5"/> Add Text to Image
          </button>
        </div>
      )}
      
      <hr className="border-gray-700" />
      
      {/* Common Edit Buttons */}
      <div className="flex items-center gap-4">
        <button onClick={handleDownload} className="flex-grow flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
          <DownloadIcon className="w-5 h-5"/> Download
        </button>
        <button onClick={handleStartOver} className="flex-grow flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
          <ResetIcon className="w-5 h-5"/> Start Over
        </button>
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            AI Influencer Factory
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Bring your virtual influencer to life, then edit and create new scenes.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="w-full lg:sticky lg:top-8">
             <ImageDisplay />
             {error && (
              <div className="mt-4 text-center bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
          </div>
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 shadow-2xl border border-gray-700">
            {mode === 'generate' ? <GenerationControls /> : <EditingControls />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;