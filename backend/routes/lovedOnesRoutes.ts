import { Router } from 'express';
import {
  create,
  getAll,
  getOne,
  update,
} from '../controllers/lovedOnesController';
import {
  complete as completeGiftPlan,
  create as createGiftPlan,
  getAllGiftPlans,
  offer as offerGiftPlan,
  remove as removeGiftPlan,
  update as updateGiftPlan,
  updateProducts as updateGiftPlanProducts,
} from '../controllers/giftPlansController';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(requireAuth);
router.use(requireRole('client'));

router.get('/', getAll);
router.get('/:lovedOneId/gift-plans', getAllGiftPlans);
router.post('/:lovedOneId/gift-plans', createGiftPlan);
router.put('/:lovedOneId/gift-plans/:giftPlanId', updateGiftPlan);
router.patch('/:lovedOneId/gift-plans/:giftPlanId/complete', completeGiftPlan);
router.patch('/:lovedOneId/gift-plans/:giftPlanId/offer', offerGiftPlan);
router.patch('/:lovedOneId/gift-plans/:giftPlanId/products', updateGiftPlanProducts);
router.delete('/:lovedOneId/gift-plans/:giftPlanId', removeGiftPlan);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);

export default router;
