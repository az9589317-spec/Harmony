
'use server'

import ImageKit from 'imagekit';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';


async function uploadBufferToImageKit(buffer: Buffer, originalFileName: string, mediaType: 'image' | 'audio' | 'video') {
    // Initialize ImageKit inside the function to access environment variables at runtime
    const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
    });

    let folder: string;
    switch(mediaType) {
        case 'image': folder = '/posts'; break;
        case 'audio': folder = '/music'; break;
        case 'video': folder = '/videos'; break;
        default: folder = '/media';
    }

    console.log('Starting ImageKit upload...');
    const result = await imagekit.upload({
        file: buffer,
        fileName: originalFileName,
        folder: folder,
        useUniqueFileName: true,
        tags: [mediaType]
    });

    console.log('Upload result:', result);

    if (!result?.url) {
        throw new Error('Upload failed - no URL was returned from ImageKit');
    }
    
    return {
        success: true,
        url: result.url,
        fileId: result.fileId,
        name: result.name
    };
}


export async function uploadMedia(formData: FormData, mediaType: 'image' | 'audio' | 'video') {
    try {
        console.log('=== SERVER ACTION START ===');
        console.log('Media type:', mediaType);
        
        const file = formData.get('file') as File | null;
        const url = formData.get('url') as string | null;

        if (!file && !url) {
            console.error('No file or URL in formData');
            return {
                success: false,
                error: 'No file or URL provided'
            };
        }

        let buffer: Buffer;
        let originalFileName: string;
        
        if (file) {
            console.log('File detected:', { name: file.name, size: file.size, type: file.type });
            const maxSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxSize) {
                const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                console.error('File too large:', fileSizeMB + 'MB');
                return { success: false, error: `File too large: ${fileSizeMB}MB. Max 100MB allowed.` };
            }
            const bytes = await file.arrayBuffer();
            buffer = Buffer.from(bytes);
            originalFileName = file.name;
        } else if (url) {
            console.log('URL detected:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch from URL: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            
            // Try to determine a reasonable file name and extension
            const nameFromUrl = url.split('/').pop()?.split('?')[0] || 'file-from-url';
            const fileTypeResult = await fileTypeFromBuffer(buffer);
            originalFileName = fileTypeResult ? `${nameFromUrl}.${fileTypeResult.ext}` : nameFromUrl;
            console.log('Fetched from URL:', { size: buffer.length, determinedFileName: originalFileName });
        } else {
             return { success: false, error: 'This should not happen. No file or URL.' };
        }

        const uploadResult = await uploadBufferToImageKit(buffer, originalFileName, mediaType);
        
        console.log('=== UPLOAD SUCCESS ===');
        
        return {
            ...uploadResult,
            // also return the buffer and original name for processing in the context
            buffer,
            originalFileName 
        };
        
    } catch (error: any) {
        console.error('=== SERVER ACTION ERROR ===');
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        
        return {
            success: false,
            error: error.message || 'An unknown error occurred during upload'
        };
    }
}
