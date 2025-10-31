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

export async function uploadImage(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        
        if (!file) {
            throw new Error('No file provided');
        }
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const result = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            folder: "/posts" // Example folder
        });
        
        return {
            success: true,
            url: result.url,
            fileId: result.fileId
        };
    } catch (error: any) {
        console.error('Upload function error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
