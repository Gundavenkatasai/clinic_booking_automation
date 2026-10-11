import { Request, Response } from 'express';
import { dataStore } from '../store/dataStore.js';
import { calculateDoctorSlots } from '../utils/slotCalculator.js';

export class DoctorController {
  public static async getDoctors(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.all !== 'true';
      const doctors = activeOnly ? dataStore.getActiveDoctors() : dataStore.getAllDoctors();
      res.json({
        success: true,
        data: doctors,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DOCTOR_FETCH_ERROR', message: err.message },
      });
    }
  }

  public static async getDoctorById(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId } = req.params;
      const doctor = dataStore.getDoctorById(doctorId);
      if (!doctor) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: `Doctor ${doctorId} not found` },
        });
        return;
      }
      res.json({
        success: true,
        data: doctor,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DOCTOR_FETCH_ERROR', message: err.message },
      });
    }
  }

  public static async getDoctorAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { doctorId } = req.params;
      const date = req.query.date as string;

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE_FORMAT',
            message: 'A valid date parameter (YYYY-MM-DD) is required',
          },
        });
        return;
      }

      const doctor = dataStore.getDoctorById(doctorId);
      if (!doctor) {
        res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: `Doctor ${doctorId} not found` },
        });
        return;
      }

      if (!doctor.active) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DOCTOR_INACTIVE',
            message: `${doctor.doctorName} is currently inactive and not accepting appointments`,
          },
        });
        return;
      }

      const availability = calculateDoctorSlots(doctor, date);
      res.json({
        success: true,
        data: availability,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'AVAILABILITY_CALCULATION_ERROR', message: err.message },
      });
    }
  }
}
