/**
 * Aura Health Clinic — Direct Google Sheets & Gmail Integration Script
 *
 * HOW TO SET THIS UP IN 1 MINUTE:
 * 1. Open your Google Sheet ("Clinic Booking Database"):
 *    https://docs.google.com/spreadsheets/d/1sznUpeC_-AZIuwIln9dM8cUfAUmy8d1cIzCSTptWIjo/edit
 * 2. Click "Extensions" > "Apps Script" in the top menu.
 * 3. Delete any default code and paste this entire file.
 * 4. Click "Deploy" (top right blue button) > "New deployment".
 * 5. Click the gear icon next to "Select type" > choose "Web app".
 * 6. Set:
 *    - Description: "Aura Clinic Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"
 * 7. Click "Deploy", approve Google permissions.
 * 8. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 9. Paste that URL into Render under Environment Variables as:
 *    GOOGLE_WEBHOOK_URL = https://script.google.com/macros/s/.../exec
 *
 * This will automatically append appointments to your Google Sheet AND
 * send real emails from your Gmail without any blocked ports!
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Appointments') || ss.getSheets()[0];

    // ==========================================
    // 1. CREATE APPOINTMENT
    // ==========================================
    if (data.action === 'CREATE_APPOINTMENT') {
      var calendarEventId = data.calendarEventId || ('gcal_' + new Date().getTime());

      // Append row to Appointments tab matching exact schema
      sheet.appendRow([
        data.bookingId,
        data.patientName,
        data.email,
        data.phone,
        data.doctorId,
        data.appointmentDate,
        data.appointmentTime,
        data.endTime,
        'confirmed',
        calendarEventId,
        'sent',
        'not_configured',
        false,
        new Date().toISOString()
      ]);

      // Dispatch confirmation email directly from your Gmail
      var subject = "Appointment Confirmed — Aura Health Clinic [" + data.bookingId + "]";
      var htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">' +
        '<div style="border-bottom: 2px solid #176B65; padding-bottom: 12px; margin-bottom: 20px;">' +
          '<h2 style="color: #176B65; margin: 0;">Aura Health Clinic</h2>' +
          '<p style="color: #64748B; margin: 4px 0 0; font-size: 14px;">Clinical Appointment Confirmation</p>' +
        '</div>' +
        '<p>Dear <strong>' + data.patientName + '</strong>,</p>' +
        '<p>Your appointment has been confirmed and scheduled with our clinical team.</p>' +
        '<div style="background-color: #F8F7F2; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #176B65;">' +
          '<p style="margin: 4px 0;"><strong>Booking Reference:</strong> <code style="background:#E2E8F0; padding:2px 6px; border-radius:4px;">' + data.bookingId + '</code></p>' +
          '<p style="margin: 4px 0;"><strong>Specialist:</strong> ' + (data.doctorName || data.doctorId) + '</p>' +
          '<p style="margin: 4px 0;"><strong>Scheduled Date:</strong> ' + data.appointmentDate + '</p>' +
          '<p style="margin: 4px 0;"><strong>Time Slot:</strong> ' + data.appointmentTime + ' – ' + data.endTime + ' IST</p>' +
          (data.reasonForVisit ? '<p style="margin: 4px 0;"><strong>Reason for Visit:</strong> ' + data.reasonForVisit + '</p>' : '') +
        '</div>' +
        '<p style="color: #475569; font-size: 14px;">Please arrive 10 minutes prior to your appointment time. If you need to reschedule or cancel, you can manage your visit online using your Booking Reference.</p>' +
        '<hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />' +
        '<p style="color: #94A3B8; font-size: 12px; margin: 0;">Aura Health Clinic • 42 Heritage Ave, Bengaluru • +91 80 4123 8899</p>' +
      '</div>';

      try {
        GmailApp.sendEmail(data.email, subject, "Appointment Confirmed for " + data.patientName + " on " + data.appointmentDate + " at " + data.appointmentTime, {
          name: "Aura Health Clinic",
          htmlBody: htmlBody
        });
      } catch (mailErr) {
        // Fallback to MailApp
        MailApp.sendEmail({
          to: data.email,
          subject: subject,
          htmlBody: htmlBody,
          name: "Aura Health Clinic"
        });
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        bookingId: data.bookingId,
        calendarEventId: calendarEventId,
        emailStatus: 'sent',
        message: "Sheet row appended and confirmation email dispatched."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 2. CANCEL APPOINTMENT
    // ==========================================
    if (data.action === 'CANCEL_APPOINTMENT') {
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.bookingId) {
          sheet.getRange(i + 1, 9).setValue('cancelled'); // column 9 is status
          break;
        }
      }

      var cancelSubject = "Appointment Cancelled — Aura Health Clinic [" + data.bookingId + "]";
      var cancelBody = '<p>Your appointment (Ref: <strong>' + data.bookingId + '</strong>) has been cancelled as requested.</p>' +
        (data.reason ? '<p>Reason: ' + data.reason + '</p>' : '') +
        '<p>If you wish to reschedule, please visit our clinic booking portal.</p>';

      GmailApp.sendEmail(data.email, cancelSubject, "Your appointment has been cancelled.", {
        name: "Aura Health Clinic",
        htmlBody: cancelBody
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'cancelled' })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 3. RESCHEDULE APPOINTMENT
    // ==========================================
    if (data.action === 'RESCHEDULE_APPOINTMENT') {
      var newDate = data.newAppointmentDate || data.newDate;
      var newTime = data.newAppointmentTime || data.newTime;
      var values = sheet.getDataRange().getValues();

      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.bookingId) {
          sheet.getRange(i + 1, 6).setValue(newDate); // date
          sheet.getRange(i + 1, 7).setValue(newTime); // time
          sheet.getRange(i + 1, 8).setValue(data.newEndTime); // end time
          sheet.getRange(i + 1, 9).setValue('rescheduled'); // status
          break;
        }
      }

      var reschedSubject = "Appointment Rescheduled — Aura Health Clinic [" + data.bookingId + "]";
      var reschedBody = '<p>Your appointment (Ref: <strong>' + data.bookingId + '</strong>) has been rescheduled to <strong>' + newDate + ' at ' + newTime + ' IST</strong>.</p>';

      GmailApp.sendEmail(data.email, reschedSubject, "Your appointment has been rescheduled to " + newDate + " at " + newTime, {
        name: "Aura Health Clinic",
        htmlBody: reschedBody
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true, status: 'rescheduled' })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Unrecognized action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
