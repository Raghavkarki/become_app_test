const extras = require('./nools-extras');
const {
  isFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  addDays,
  getNewestDeliveryTimestamp,
  getNewestPregnancyTimestamp,
  getMostRecentLMPDateForPregnancy,
  getTimeForMidnight,
  getField,
  getMostRecentReport,
  cervicalForms
} = extras;

const ancSchedule = [
  // From start of 8th week to the end of 
  {
    start: 35,
    due: 84,
    end: 7
  },
  {
    start: 27,
    due: 112,
    end: 21
  },
  {
    start: 35,
    due: 168,
    end: 7
  },
  {
    start: 7,
    due: 196,
    end: 7
  },
  {
    start: 7,
    due: 224,
    end: 7
  },
  {
    start: 7,
    due: 238,
    end: 7
  },
  {
    start: 7,
    due: 252,
    end: 7
  },
  {
    start: 21,
    due: 280,
    end: 7
  }
];

const pncSchedule = [

  {
    start: 100,
    due: 2,
    end: 2
  },
  {
    start: 600,
    due: 13,
    end: 2
  },
  {
    start: 200,
    due: 41,
    end: 2
  }
];

function isFieldDateInWindow(reports, forms, fieldDate, startTime, endTime) {
  const mostRecentReport = getMostRecentReport(reports, forms);
  if (!mostRecentReport) {
    return false;
  }

  const fieldDateValue = getField(mostRecentReport, fieldDate);
  const deliveryDate = new Date(fieldDateValue);

  if (isNaN(deliveryDate)) {
    return false;
  }

  return deliveryDate >= new Date(startTime) && deliveryDate <= new Date(endTime);
}

function checkTaskResolvedForDeliveryReminder(contact, report, event, dueDate) {
  //miscarriage or abortion
  if (getRecentANCVisitWithEvent(contact, report, 'abortion')
    || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) { return true; }

  // pregnancy task muted for other reasons.
  if (isPregnancyTaskMuted(contact)) { return true; }

  // Tasks cleared by delivery
  const startTime = getMostRecentLMPDateForPregnancy(contact, report);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFieldDateInWindow(contact.reports, ['delivery'], 'preg_info.delivery_date', startTime, endTime);
}

function checkTaskResolvedForHomeVisit(contact, report, event, dueDate) {
  //delivery form submitted
  if (report.reported_date < getNewestDeliveryTimestamp(contact)) { return true; }

  //old pregnancy report
  if (report.reported_date < getNewestPregnancyTimestamp(contact)) { return true; }

  //miscarriage or abortion or cleared
  if (getRecentANCVisitWithEvent(contact, report, 'abortion')
    || getRecentANCVisitWithEvent(contact, report, 'miscarriage')
  ) { return true; }

  //Due date older than reported day
  const endDate = addDays(dueDate, event.end);
  if (endDate <= getTimeForMidnight(report.reported_date)) { return true; }

  //Tasks cleared
  if (isPregnancyTaskMuted(contact)) { return true; }
  const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_home_visit'], startTime, endTime);
}

function checkTaskAppliesForMentalHealthReferralFollowup(contact, report) {
  // Checking followup form trigger condition
  if (report.form === 'mental_health_referral_follow_up') {
    return getField(report, 'mental_health_treatment_followup.visited_hospital_or_not') === 'no';
  }

  let behaviorSelected = getField(report, 'mental_health_screening.changes_in_behavior');
  if (behaviorSelected.trim() === 'none') { return false; }
  behaviorSelected = behaviorSelected.split(' ').map(opt => opt.trim());

  // Checking source form
  const behavioralSigns = ['powerful_person', 'talk_unnecessary', 'audio_hallucination', 'walk_around_dirty'];
  const depressionSigns = ['loss_of_interest_in_work', 'insomnia', 'disappointed_with_life', 'thinking_future_is_dark', 'getting_angry_quickly'];
  const sucidialSigns = ['weak_and_helpless', 'suicidal_thoughts'];
  const anxietySigns = ['anxiety_heart_palpitations', 'rude', 'body_ache', 'no_health_issue', 'stress_feeling'];
  const epilepsyOrOtherSigns = ['convulsion_and_froathing', 'other_signs_and_symptoms'];

  const groupW1 = [sucidialSigns, epilepsyOrOtherSigns];
  const groupW2 = [behavioralSigns, depressionSigns, anxietySigns];

  let danger = false;

  // Group 1 has signs where one symptom can flag danger
  // Group 2 has signs where you need two symptoms to flag
  [groupW1, groupW2].forEach((group, threshold) => {
    // Escape loop if danger sign discovered
    if (danger) {
      return;
    }

    // `threshold` holds index, for group 1 its 1 and for 2 its 2
    // Hence, it also acts as a danger upper limit for each group
    group.forEach(behaviorGroup => {
      const thresholdCrossed = behaviorGroup.filter(opt => behaviorSelected.includes(opt)).length > threshold;

      if (thresholdCrossed) {
        danger = true;
        return;
      }
    });
  });

  return danger;
}

function checkTaskAppliesForCervicalCancerFollowup(contact, report) {
  if (report.form === 'cervical_cancer_screening') {
    return getField(report, 'screening_for_cervical_cancer.checked_cervical_cancer') === 'no';
  }

  // Checking the number of followups, exiting if more than 1 followups
  if (contact.reports.filter(r => {
    if (r.form !== 'cervical_cancer_referral_follow_up_visit') { return false; }

    const mostRecentCervicalScreening = getMostRecentReport(contact.reports, cervicalForms);
    return r.reported_date > mostRecentCervicalScreening.reported_date;
  }).length > 1) {
    return false;
  }

  return getField(report, 'cervical_cancer_followup.visit_exam') === 'no';
}

function checkNotUndefinedorNone(report, field) {
  const value = getField(report, field);
  return value && value !== 'none';
}

module.exports = {
  ancSchedule,
  pncSchedule,
  checkTaskAppliesForMentalHealthReferralFollowup,
  checkTaskAppliesForCervicalCancerFollowup,
  checkTaskResolvedForDeliveryReminder,
  checkTaskResolvedForHomeVisit,
  checkNotUndefinedorNone
};
