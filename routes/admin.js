const express = require('express');
const router = express.Router();
const {
  createTrend,
  updateTrend,
  deleteTrend,
  getAllTrends,
  addVideo,
  addEvidence,
  createAdmin,
  adminLogin,
  getDashboard,
  getAllCategories,
  createCategory,
  deleteCategory,
  createTag,
  getAllTags,
  updateTag,
  deleteTag,
  getAllPredictionsAdmin,
  createPrediction,
  updatePrediction,
  deletePrediction,
  getTrendById,
  getTrendPrediction,
  getTrendComments,
  getTrendVideos,
  getTrendEvidence,
  addComment,
  deleteComment,
  deleteVideo,
  deleteEvidence
  
} = require('../controller/admin');

const { uploadImage, uploadVideo } = require('../middleware/upload');


const { protectAdmin,adminOnly   } = require('../middleware/admin');


router.post('/create', createAdmin);
router.post('/login',  adminLogin);




router.get('/dashboard', protectAdmin,adminOnly,        getDashboard);
router.get('/trends',     protectAdmin,adminOnly,        getAllTrends);
router.post('/trends',      protectAdmin,adminOnly,      createTrend);
router.put('/trends/:id',     protectAdmin,adminOnly,    updateTrend);
router.delete('/trends/:id',  protectAdmin,adminOnly,    deleteTrend);
router.post('/trends/:id/videos', protectAdmin,adminOnly,  uploadVideo.single('videoFile') ,addVideo);
router.post('/trends/:id/evidence', protectAdmin,adminOnly, uploadImage.single("screenshotFile"),addEvidence);
router.get('/categories',     protectAdmin,adminOnly,    getAllCategories);
router.post('/categories',     protectAdmin,adminOnly,   createCategory);
router.delete('/categories/:id', protectAdmin,adminOnly, deleteCategory);
router.get('/trend/:id',protectAdmin,adminOnly, getTrendById);



router.get('/trends/:id/prediction',   protectAdmin,adminOnly,   getTrendPrediction);
router.get('/trends/:id/comments',    protectAdmin,adminOnly,    getTrendComments);
router.get('/trends/:id/videos',     protectAdmin,adminOnly,     getTrendVideos);
router.get('/trends/:id/evidence',   protectAdmin,adminOnly,     getTrendEvidence);



router.get('/tags',    protectAdmin,adminOnly,     getAllTags);
router.post('/tags',    protectAdmin,adminOnly,    createTag);
router.put('/tags/:id',  protectAdmin,adminOnly,   updateTag);
router.delete('/tags/:id',protectAdmin,adminOnly,  deleteTag);








router.get('/predictions',protectAdmin,adminOnly,  getAllPredictionsAdmin);
router.post('/predictions',protectAdmin,adminOnly,  createPrediction);
router.patch('/predictions/:id', protectAdmin,adminOnly, updatePrediction);
router.delete('/predictions/:id', protectAdmin,adminOnly, deletePrediction);






router.post('/trends/:id/comments',protectAdmin,adminOnly,  uploadVideo.single('commentVideoFile'), addComment);
router.delete('/trends/:id/comments/:cid',protectAdmin,adminOnly,    deleteComment);
router.delete('/trends/:id/videos/:vid',  protectAdmin,adminOnly,    deleteVideo);
router.delete('/trends/:id/evidence/:eid', protectAdmin,adminOnly,   deleteEvidence);
module.exports = router;  