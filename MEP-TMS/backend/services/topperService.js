const Assessment = require('../models/Assessment');
const Candidate = require('../models/Candidate');

const topperService = {
  calculateToppers: async (batchId, weightages = {}) => {
    try {
      // Default weightages
      const weights = {
        sprintReview: weightages.sprintReview || 0.20,
        apiCoding: weightages.apiCoding || 0.30,
        project: weightages.project || 0.50,
      };

      const candidates = await Candidate.find({ batch: batchId });
      
      const candidatesWithScores = candidates.map(candidate => {
        const overallScore =
          (candidate.sprintReviewScore || 0) * weights.sprintReview +
          (candidate.apiCodingScore || 0) * weights.apiCoding +
          (candidate.projectScore || 0) * weights.project;

        return {
          _id: candidate._id,
          candidateId: candidate.candidateId,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          overallScore: Math.round(overallScore * 100) / 100,
          sprintReviewScore: candidate.sprintReviewScore,
          apiCodingScore: candidate.apiCodingScore,
          projectScore: candidate.projectScore,
        };
      });

      // Sort by overall score descending
      candidatesWithScores.sort((a, b) => b.overallScore - a.overallScore);

      // Get top 10%
      const topperCount = Math.max(1, Math.ceil(candidatesWithScores.length * 0.1));
      const toppers = candidatesWithScores.slice(0, topperCount);

      // Mark toppers in database
      for (const topper of toppers) {
        await Candidate.findByIdAndUpdate(topper._id, { isTopper: true });
      }

      return toppers;
    } catch (error) {
      console.error('Error calculating toppers:', error);
      throw error;
    }
  },

  getToppersBatch: async (batchId) => {
    try {
      const toppers = await Candidate.find({ batch: batchId, isTopper: true })
        .sort({ overallScore: -1 });
      return toppers;
    } catch (error) {
      console.error('Error fetching toppers:', error);
      throw error;
    }
  },
};

module.exports = topperService;
