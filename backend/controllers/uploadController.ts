import { Request, Response } from 'express';
import { uploadImageToStorage } from '../services/uploadService';

export async function uploadImage(req: Request, res: Response) {
    try {
        const uid = req.user?.uid;
        console.log('REQ.FILE:', req.file);
        console.log('REQ.BODY:', req.body);

        if (!uid) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const imageUrl = await uploadImageToStorage(file, uid);

        return res.status(200).json({ imageUrl });


    } catch {
        return res.status(500).json({ message: 'Upload failed' });
    }

}

