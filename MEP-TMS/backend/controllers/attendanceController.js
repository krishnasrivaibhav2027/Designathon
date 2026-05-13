const Attendance = require('../models/Attendance');
const Candidate = require('../models/Candidate');
const Batch = require('../models/Batch');

// Upload attendance
exports.uploadAttendance = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { attendanceData } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const records = [];
    for (const record of attendanceData) {
      const candidate = await Candidate.findOne({
        candidateId: record.candidateId,
        batch: batchId,
      });

      if (!candidate) {
        continue;
      }

      const attendance = await Attendance.findOneAndUpdate(
        {
          batch: batchId,
          candidate: candidate._id,
          date: new Date(record.date),
        },
        {
          status: record.status,
          remarks: record.remarks,
          uploadedBy: req.user.id,
          $inc: { version: 1 },
        },
        { upsert: true, new: true }
      );

      records.push(attendance);
    }

    res.json({ message: 'Attendance uploaded', records });
  } catch (error) {
    next(error);
  }
};

// Get attendance records
exports.getAttendanceRecords = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { batch: batchId };
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const records = await Attendance.find(filter)
      .populate('candidate', 'candidateId firstName lastName')
      .populate('uploadedBy', 'firstName lastName');

    res.json(records);
  } catch (error) {
    next(error);
  }
};

// Get attendance statistics
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const attendanceRecords = await Attendance.find({ batch: batchId });
    const candidates = await Candidate.find({ batch: batchId });

    let totalPresent = 0;
    let totalAbsent = 0;

    attendanceRecords.forEach(record => {
      if (record.status === 'PRESENT') totalPresent++;
      if (record.status === 'ABSENT') totalAbsent++;
    });

    const totalRecords = attendanceRecords.length;
    const stats = {
      totalCandidates: candidates.length,
      totalAttendanceRecords: totalRecords,
      totalPresent,
      totalAbsent,
      attendancePercentage: totalRecords > 0 ? (totalPresent / totalRecords * 100).toFixed(2) : 0,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};
