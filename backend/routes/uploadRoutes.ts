import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadImage } from '../controllers/uploadController';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.post('/', requireAuth, upload.single('image'), uploadImage);

export default router;