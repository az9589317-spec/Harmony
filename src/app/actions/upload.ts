'use server'

import ImageKit from 'imagekit';
import { Buffer } from 'buffer';

export async function uploadMedia(formData: FormData, mediaType: 'image' | 'audio' | 'video') {
    try {
        // Initialize ImageKit inside the action to access environment variables at runtime
        const imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
        });

        console.log('=== SERVER ACTION START ===');
        console.log('Media type:', mediaType);
        
        const file = formData.get('file') as File;
        
        if (!file) {
            console.error('No file in formData');
            return {
                success: false,
                error: 'No file provided'
            };
        }
        
        console.log('File:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        
        // Folder selection
        let folder: string;
        switch(mediaType) {
            case 'image':
                folder = '/posts';
                break;
            case 'audio':
                folder = '/music';
                break;
             case 'video':
                folder = '/videos';
                break;
            default:
                folder = '/media';
        }
        
        // Size check
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            console.error('File too large');
            return {
                success: false,
                error: `File exceeds 100MB limit. File size: ${(file.size/1024/1024).toFixed(2)}MB`
            };
        }
        
        // Convert to buffer
        console.log('Converting to buffer...');
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        console.log('Buffer size:', buffer.length);
        
        // Upload
        console.log('Starting ImageKit upload...');
        const result = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
            tags: [mediaType]
        });
        
        console.log('Upload result:', result);
        
        if (!result?.url) {
            console.error('No URL in ImageKit response');
            return {
                success: false,
                error: 'Upload failed - no URL was returned from ImageKit'
            };
        }
        
        console.log('=== UPLOAD SUCCESS ===');
        
        return {
            success: true,
            url: result.url,
            fileId: result.fileId,
            name: result.name
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
