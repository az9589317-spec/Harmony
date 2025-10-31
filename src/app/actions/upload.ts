'use server'

import ImageKit from 'imagekit';
import { Buffer } from 'buffer';

if (!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
    throw new Error('ImageKit environment variables are not configured.');
}

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
});


export async function uploadMedia(formData: FormData, mediaType: 'image' | 'audio') {
    try {
        const file = formData.get('file') as File;
        
        if (!file) {
            throw new Error('No file selected');
        }
        
        let folder: string;
        switch(mediaType) {
            case 'image':
                folder = '/posts';
                break;
            case 'audio':
                folder = '/music';
                break;
            default:
                folder = '/media';
        }
        
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            throw new Error(`File too large: ${(file.size/1024/1024).toFixed(2)}MB. Max 100MB`);
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const result = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
            tags: [mediaType]
        });
        
        if (!result || !result.url) {
            throw new Error('ImageKit did not return a URL');
        }
        
        return {
            success: true,
            url: result.url,
            fileId: result.fileId,
            name: result.name
        };
        
    } catch (error: any) {
        console.error('Upload function error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
