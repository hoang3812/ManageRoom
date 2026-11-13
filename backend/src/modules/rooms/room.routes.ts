import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { upload } from '../../middlewares/upload.middleware';
import * as controller from './room.controller';

const router = Router();

// Room types
router.get('/types', authenticate, controller.getRoomTypes);
router.post('/types', authenticate, authorize('OWNER'), controller.createRoomType);

// Rooms CRUD
router.get('/', authenticate, controller.getAllRooms);
router.post('/', authenticate, authorize('OWNER', 'STAFF'), controller.createRoom);
router.get('/:id', authenticate, controller.getRoomById);
router.put('/:id', authenticate, authorize('OWNER', 'STAFF'), controller.updateRoom);
router.delete('/:id', authenticate, authorize('OWNER'), controller.deleteRoom);

// Images
router.post('/:id/images', authenticate, authorize('OWNER', 'STAFF'), upload.array('images', 10), controller.uploadRoomImages);

// Status
router.patch('/:id/status', authenticate, authorize('OWNER', 'STAFF'), controller.updateRoomStatus);

export default router;
