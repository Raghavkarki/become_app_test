const moment = require('moment');
const today = moment().startOf('day');

const isReportValid = function (report) {
  if (report.form && report.fields && report.reported_date) { return true; }
  return false;
};

const PATIENT_TYPE = 'c82_person';
const allPlaces =
  [
    'c10_center', 'c20_province', 'c30_district', 'c40_municipality',
    'c50_ward', 'c60_chn_area', 'c70_fchv_area', 'c80_household'
  ];

const allPersons = [
  'c12_center_contact', 'c22_province_contact', 'c32_district_contact', 'c42_municipality_contact',
  'c52_ward_contact', 'c62_chn_area_contact', 'c72_fchv_area_contact', 'c82_person'
];

const nonHouseholdPlaces = allPlaces.filter(place => place !== 'c80_household');
const nonHouseholdPersons = allPersons.filter(person => person !== 'c82_person');

const pregnancyForms = ['pregnancy'];

const antenatalForms = ['pregnancy_home_visit'];

const deliveryForms = ['delivery', 'pnc_danger_sign_follow_up_mother'];

const cervicalForms = ['cervical_cancer_screening'];

const pregnancDangerSignForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'pregnancy_danger_sign_follow_up'];

const childHealthScreeningForms = ['child_health_screening'];

const MAX_DAYS_IN_PREGNANCY = 42 * 7;
const AVG_DAYS_IN_PREGNANCY = 280;

const getAge = (contact) => today.diff(moment(contact.date_of_birth).startOf('day'), 'years');

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function getFormArraySubmittedInWindow(allReports, formArray, start, end) {
  return allReports.filter(function (report) {
    return formArray.includes(report.form) &&
      report.reported_date >= start && report.reported_date <= end;
  });
}


function getNewestReport(allReports, forms) {
  let result;
  allReports.forEach(function (report) {
    if (!isReportValid(report) || !forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


function getLMPDateFromPregnancy(report) {
  return isPregnancyForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601'));
}

function getLMPDateFromPregnancyFollowUp(report) {
  return isPregnancyFollowUpForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601'));
}

function getMostRecentLMPDateForPregnancy(allReports, pregnancyReport) {
  let mostRecentLMP = getLMPDateFromPregnancy(pregnancyReport);
  let mostRecentReportDate = pregnancyReport.reported_date;
  getSubsequentPregnancyFollowUps(allReports, pregnancyReport).forEach(function (visit) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(visit);
    if (visit.reported_date > mostRecentReportDate && getField(visit, 'lmp_updated') === 'yes') {
      mostRecentReportDate = visit.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });
  return mostRecentLMP;
}

function getMostRecentEDDForPregnancy(allReports, report) {
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
  if (lmpDate) {
    return lmpDate.clone().add(AVG_DAYS_IN_PREGNANCY, 'days');
  }
}

function getDeliveryDate(report) {
  return isDeliveryForm(report) && getField(report, 'preg_info.delivery_date') && moment(getField(report, 'preg_info.delivery_date'));
}

function getNextANCVisitDate(allReports, report) {
  let nextVisit = getField(report, 't_pregnancy_follow_up_date');
  let eddReportDate = report.reported_date;
  const followUps = getSubsequentPregnancyFollowUps(allReports, report);
  followUps.forEach(function (followUpReport) {
    if (followUpReport.reported_date > eddReportDate && !!getField(followUpReport, 't_pregnancy_follow_up_date')) {
      eddReportDate = followUpReport.reported_date;
      nextVisit = getField(followUpReport, 't_pregnancy_follow_up_date');
    }
  });
  return moment(nextVisit);
}


function getDangerSignCodes(report) {
  const dangerSignCodes = [];
  if (getField(report, 't_danger_signs_referral_follow_up') === 'yes') {
    const dangerSignsObj = getField(report, 'danger_signs');
    if (dangerSignsObj) {
      for (const dangerSign in dangerSignsObj) {
        if (dangerSignsObj[dangerSign] === 'yes' && dangerSign !== 'r_danger_sign_present') {
          dangerSignCodes.push(dangerSign);
        }
      }
    }
  }
  return dangerSignCodes;
}

function getLatestDangerSignsForPregnancy(allReports, pregnancy) {
  if (!pregnancy) { return []; }
  let lmpDate = getMostRecentLMPDateForPregnancy(allReports, pregnancy);
  if (!lmpDate) { lmpDate = moment(pregnancy.reported_date); } //If unknown, take preganacy.reported_date
  const allReportsWithDangerSigns = getFormArraySubmittedInWindow(allReports, pregnancDangerSignForms, lmpDate.toDate(), lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days').toDate());
  const allRelevantReports = [];
  allReportsWithDangerSigns.forEach((report) => {
    if (isPregnancyFollowUpForm(report)) {
      //only push pregnancy home visit report that have actually been visited
      if (getField(report, 'pregnancy_summary.visit_option') === 'yes') {
        allRelevantReports.push(report);
      }
    }
    //for other reports with danger signs, push without checking for visit
    else {
      allRelevantReports.push(report);
    }
  });
  const recentReport = getNewestReport(allRelevantReports, pregnancDangerSignForms);
  if (!recentReport) { return []; }
  return getDangerSignCodes(recentReport);
}


function getRiskFactorsFromPregnancy(report) {
  const riskFactors = [];
  if (!isPregnancyForm(report)) { return []; }

  const riskFactorsPrimary = getField(report, 'risk_factors.primary_cond.primary_condition');
  const riskFactorsSecondary = getField(report, 'risk_factors.secondary_group.secondary_condition');
  if (riskFactorsPrimary) {
    riskFactors.push(...riskFactorsPrimary.split(' '));
  }
  if (riskFactorsSecondary) {
    riskFactors.push(...riskFactorsSecondary.split(' '));
  }

  //filter out 'none' if it exists
  return riskFactors.filter(riskFactor => riskFactor !== 'none');
}

function getNewRiskFactorsFromFollowUps(report) {
  const riskFactors = [];
  if (!isPregnancyFollowUpForm(report)) { return []; }
  if (getField(report, 'anc_visits_hf.risk_factors.r_risk_factor_present') === 'yes') {
    const newRiskFactors = getField(report, 'anc_visits_hf.risk_factors.new_risks');
    if (newRiskFactors) {
      riskFactors.push(...newRiskFactors.split(' '));
    }
  }
  return riskFactors;
}

function getAllRiskFactors(allReports, pregnancy) {
  const riskFactorCodes = getRiskFactorsFromPregnancy(pregnancy);
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach(function (visit) {
    riskFactorCodes.push(...getNewRiskFactorsFromFollowUps(visit));
  });
  return riskFactorCodes;
}

function getRiskFactorExtra(report) {
  let extraRisk;
  if (report && isPregnancyForm(report)) {
    extraRisk = getField(report, 'risk_factors.risk_factors_present.additional_risk');
  }
  else if (report && isPregnancyFollowUpForm(report)) {
    extraRisk = getField(report, 'anc_visits_hf.risk_factors.additional_risk');
  }
  return extraRisk;
}

function getAllRiskFactorExtra(allReports, pregnancy) {
  const riskFactorsExtra = [];
  const riskFactorExtraFromPregnancy = getRiskFactorExtra(pregnancy);
  if (riskFactorExtraFromPregnancy) {
    riskFactorsExtra.push(riskFactorExtraFromPregnancy);
  }
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach(function (visit) {
    const riskFactorExtraFromVisit = getRiskFactorExtra(visit);
    if (riskFactorExtraFromVisit) {
      riskFactorsExtra.push(riskFactorExtraFromVisit);
    }
  });
  return riskFactorsExtra;
}

function getChildVaccinations(thisContact, allReports) {
  if (thisContact.contact_type !== PATIENT_TYPE) { return {}; }

  if (thisContact.date_of_birth) {
    const ageInYears = getAge(thisContact);

    if (ageInYears > 5) {
      return {};
    }
  }

  const mostRecentChildReport = getNewestReport(allReports, childHealthScreeningForms);

  if (!mostRecentChildReport) {
    return {};
  }

  const context = {};

  Object.entries({
    bcg_vax: 'vaccination_history.history_bcg',
    oral_polio_first_dose_vax: 'vaccination_history.history_oral_polio_first_dose',
    pentavalent_first_dose_vax: 'vaccination_history.history_pentavalent_first_dose',
    rota_vaccine_first_dose_vax: 'vaccination_history.history_rota_vaccine_first_dose',
    rota_vaccine_second_dose_vax: 'vaccination_history.history_rota_vaccine_second_dose',
    oral_polio_second_dose_vax: 'vaccination_history.history_oral_polio_second_dose',
    pentavalent_second_dose_vax: 'vaccigetChildVaccnation_history.history_pentavalent_second_dose',
    pcv_first_dose_vax: 'vaccination_history.history_pcv_first_dose',
    oral_polio_third_dose_vax: 'vaccination_history.history_oral_polio_third_dose',
    pentavalent_third_dose_vax: 'vaccination_history.history_pentavalent_third_dose',
    fipv_first_dose_vax: 'vaccination_history.history_fipv_first_dose',
    fipv_second_dose_vax: 'vaccination_history.history_fipv_second_dose',
    pcv_second_dose_vax: 'vaccination_history.history_pcv_second_dose',
    measles_rubella_first_dose_vax: 'vaccination_history.history_measles_rubella_first_dose',
    pcv_third_dose_vax: 'vaccination_history.history_pcv_third_dose',
    je_vaccine_vax: 'vaccination_history.history_je_vaccine',
    measles_rubella_second_dose_vax: 'vaccination_history.history_measles_rubella_second_dose',
    typhoid_vax: 'vaccination_history.history_typhoid'
  }).forEach(([key, field]) => {
    const value = getField(mostRecentChildReport, field);
    if (value !== undefined) {
      context[key] = value;
    }
  });

  return context;
}

const isHighRiskPregnancy = function (allReports, pregnancy) {
  return getAllRiskFactors(allReports, pregnancy).length ||
    getAllRiskFactorExtra(allReports, pregnancy).length ||
    getDangerSignCodes(pregnancy).length;
};

function isAlive(thisContact) {
  return thisContact && !thisContact.date_of_death;
}

function isPregnancyForm(report) {
  return report && pregnancyForms.includes(report.form);
}

function isPregnancyFollowUpForm(report) {
  return report && antenatalForms.includes(report.form);
}

function isDeliveryForm(report) {
  return report && deliveryForms.includes(report.form);
}

function getSubsequentPregnancies(allReports, refReport) {
  return allReports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}

function isActivePregnancy(thisContact, allReports, report) {
  if (thisContact.contact_type !== PATIENT_TYPE || !isAlive(thisContact) || !isPregnancyForm(report)) { return false; }
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report) || report.reported_date;
  const isPregnancyRegisteredWithin9Months = lmpDate > today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'day');
  const isPregnancyTerminatedByDeliveryInLast6Weeks = getSubsequentDeliveries(allReports, report, 6 * 7).length > 0;
  const isPregnancyTerminatedByAnotherPregnancyReport = getSubsequentPregnancies(allReports, report).length > 0;
  return isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !getRecentANCVisitWithEvent(allReports, report, 'abortion') &&
    !getRecentANCVisitWithEvent(allReports, report, 'miscarriage');
}

function isPregnant(allReports) {
  return allReports.some(report => isActivePregnancy(report));
}

function isReadyForNewPregnancy(thisContact, allReports) {
  if (thisContact.contact_type !== PATIENT_TYPE) { return false; }
  const mostRecentPregnancyReport = getNewestReport(allReports, pregnancyForms);
  const mostRecentDeliveryReport = getNewestReport(allReports, deliveryForms);
  if (!mostRecentPregnancyReport && !mostRecentDeliveryReport) {
    return true; //No previous pregnancy or delivery recorded, fresh profile
  }

  else if (!mostRecentPregnancyReport) {
    //Delivery report without pregnancy report
    //Decide on the basis of Delivery report

    if (mostRecentDeliveryReport && getDeliveryDate(mostRecentDeliveryReport) < today.clone().subtract(6 * 7, 'day')) {
      return true; //Delivery date on most recentlty submitted delivery form is more than 6 weeks ago
    }
  }

  else if (!mostRecentDeliveryReport || mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date) {
    //Pregnancy report without delivery report, or Pregnancy report newer than Delivery report
    //Decide on the basis of Pregnancy report

    let mostRecentlySubmittedLMPDate = getMostRecentLMPDateForPregnancy(allReports, mostRecentPregnancyReport);
    if (!mostRecentlySubmittedLMPDate) {
      mostRecentlySubmittedLMPDate = moment(mostRecentPregnancyReport.reported_date);
    }
    if (mostRecentlySubmittedLMPDate < today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'day')) {
      return true;
      //Most recently submitted LMP is more than 294 days (42 weeks) ago
    }
    if (getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')) {
      return true;
    }
  }

  else {
    //Both pregnancy and delivery report, Delivery report is newer than pregnancy report
    //Decide on the basis of Delivery report
    if (mostRecentDeliveryReport) {
      //Delivery date on most recentlty submitted delivery form is more than 6 weeks ago
      return getDeliveryDate(mostRecentDeliveryReport) < today.clone().subtract(6 * 7, 'day');
    }
  }
  return false;
}

function isReadyForDelivery(thisContact, allReports) {
  //If pregnancy registration, date of LMP should be at least 6 months ago and no more than EDD + 6 weeks. 
  //If pregnancy registration and no LMP, make it available at registration and until 280 days + 6 weeks from the date of registration. 
  //If no pregnancy registration, previous delivery date should be at least 7 months ago.
  if (thisContact.contact_type !== PATIENT_TYPE) { return false; }
  const latestPregnancy = getNewestReport(allReports, pregnancyForms);
  const latestDelivery = getNewestReport(allReports, deliveryForms);
  if (!latestPregnancy) {
    //no previous pregnancy, return false
    return false;
  }

  else if (latestDelivery && latestDelivery.reported_date > latestPregnancy.reported_date) {
    // if previous delivery, previous delivery date should be at least 7 months ago.
    return getDeliveryDate(latestDelivery) < today.clone().subtract(7, 'months');
  }

  else if (latestPregnancy) {
    if (isPregnancyForm(latestPregnancy)) {
      const lmpDate = getMostRecentLMPDateForPregnancy(allReports, latestPregnancy);
      if (!lmpDate) {//no LMP, show until 280 days + 6 weeks from the date of registration
        return moment(latestPregnancy.reported_date).clone().startOf('day').add(280 + 6 * 7, 'days').isSameOrBefore(today);
      }
      else {//Pregnancy registration with LMP
        const edd = getMostRecentEDDForPregnancy(allReports, latestPregnancy);
        //at least 6 months ago, no more than EDD + 6 weeks
        return today.isBetween(lmpDate.clone().add(6, 'months'), edd.clone().add(6, 'weeks'));
      }
    }
  }
  return false;
}

function isReadyForCervicalScreening(thisContact, allReports) {
  if (thisContact.contact_type !== PATIENT_TYPE || thisContact.gender === 'male') { return false; }

  if (thisContact.date_of_birth) {
    const ageInYears = getAge(thisContact);

    if (ageInYears < 30 || ageInYears > 60) {
      return false;
    }
  }

  const latestCervicalSurveillance = getNewestReport(allReports, cervicalForms);
  if (!latestCervicalSurveillance) {
    // No previous screening
    return true;
  }

  // Show cervical form if the last report submitted was 5 years or older
  const reportedMoment = moment(latestCervicalSurveillance.reported_date).startOf('day');
  return today.diff(reportedMoment, 'years') >= 5;
}

function getRecentANCVisitWithEvent(allReports, pregnancyReport, event) {
  //event can be one of miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
}

function getSubsequentDeliveries(allReports, pregnancyReport, withinXDays) {
  return allReports.filter(function (report) {
    return (isDeliveryForm(report)) &&
      report.reported_date > pregnancyReport.reported_date &&
      (!withinXDays || pregnancyReport.reported_date >= (moment(report.reported_date).subtract(withinXDays, 'days')));
  });
}

function getSubsequentPregnancyFollowUps(allReports, pregnancyReport) {
  let lmpDate = getLMPDateFromPregnancy(pregnancyReport);
  if (!lmpDate) { //LMP Date is not available, use reported date
    lmpDate = moment(pregnancyReport.reported_date);
  }
  const subsequentVisits = allReports.filter(function (visitReport) {
    return isPregnancyFollowUpForm(visitReport) &&
      visitReport.reported_date > pregnancyReport.reported_date &&
      moment(visitReport.reported_date) < lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days');
  });
  return subsequentVisits;
}

function countANCFacilityVisits(allReports, pregnancyReport) {
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  if (getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past') && !isNaN(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'))) {
    ancHFVisits += parseInt(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
  }
  ancHFVisits += pregnancyFollowUps.reduce(function (sum, report) {
    const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');
    if (!pastANCHFVisits) { return 0; }
    sum += pastANCHFVisits.last_visit_attended === 'yes' && 1;
    if (isNaN(pastANCHFVisits.visited_hf_count)) { return sum; }
    return sum += pastANCHFVisits.report_other_visits === 'yes' && parseInt(pastANCHFVisits.visited_hf_count);
  }, 0);
  return ancHFVisits;
}

function knowsHIVStatusInPast3Months(allReports) {
  let knows = false;
  const pregnancyFormsIn3Months = getFormArraySubmittedInWindow(allReports, pregnancyForms, today.clone().subtract(3, 'months'), today);
  pregnancyFormsIn3Months.forEach(function (report) {
    if (getField(report, 'pregnancy_new_or_current.hiv_status.hiv_status_know') === 'yes') {
      knows = true;
    }
  });
  return knows;
}

const getFieldIfNotSetTo = (currentValue, report, path, expectedValue = 'yes') => (currentValue !== expectedValue) ? getField(report, path) : currentValue;

function getContext(thisContact, allReports) {
  const context = Object.assign({},
    getAge(thisContact) <= 5 ? getChildVaccinations(thisContact, allReports) : {}
  );

  context.alive = isAlive(thisContact);
  context.show_pregnancy_form = isReadyForNewPregnancy(thisContact, allReports);
  context.show_delivery_form = isReadyForDelivery(thisContact, allReports);
  context.show_cervical_form = isReadyForCervicalScreening(thisContact, allReports);

  if (thisContact.contact_type === 'c82_person' && getAge(thisContact) >= 30) {
    const hasNcdRecord = allReports.some(report => ['hypertension_screening', 'diabetes_screening'].includes(report.form));
    if (hasNcdRecord) {
      //hypertension
      const [bmiForHypertension, bmiHypertensionResult] = [ncdBmiCalculation(allReports, 'bmi_result'), ncdBmiCalculation(allReports, 'bmi_cal')];
      const { systolic, diastolic, average } = getLatestBloodPressure(allReports, 'hypertension_screening');
      context.avg_result = average;
      context.diastolic_result = diastolic;
      context.systolic_result = systolic;
      context.bmi_result_ctx = bmiForHypertension;
      context.bmical_show_ctx = bmiHypertensionResult;
      context.bmi_previous_ctx = 'yes' ;
      //diabetes
      const [bmiForDiabetes, bmiDiabetesResult] = [ncdBmiCalculation(allReports, 'bmi_cal'), ncdBmiCalculation(allReports, 'bmi_result')];
      const latestDiabetesScreeningReport = getNewestReport(reports, 'diabetes_screening');
      const glucometerData = getField(latestDiabetesScreeningReport, 'diabetes_screening.glucometer');
      const dangerTriggerForPssRbs = getField(latestDiabetesScreeningReport, 'dt_pps_rbs');
      const dangerTriggerForFbs = getField(latestDiabetesScreeningReport, 'dt_fbs');

      context.bmi_result_ctx_diabetes = bmiDiabetesResult;
      context.bmical_show_ctx_diabetes = bmiForDiabetes;
      context.glucometer_ctx = glucometerData;
      context.dt_pps_rbs_ctx = dangerTriggerForPssRbs;
      context.dt_fbs_ctx = dangerTriggerForFbs;
    }
  }
  if (thisContact.contact_type === 'c82_person' && thisContact.gender === 'female') {
    const deliveryRecord = allReports.some(report => report.form === 'delivery');
    if (deliveryRecord) {
      const latestDeliveryForm = getNewestReport(allReports, 'delivery');
      const deliveryDate = getField(latestDeliveryForm, 'preg_info.delivery_date');
      const deliveryDays = daysSinceDelivery(allReports);
      const deliveryInfo = getBabyStatus;
      const motherStatus = getField(latestDeliveryForm, 'mother_info.mother_status');
      const deliveryType = getField(latestDeliveryForm, 'preg_info.delivery_type');
      const maxNumberOfBabies = 4;
      const totalVisitpnc = (reports) => {
        const latestDeliveryDate = latestDeliveryForm ? latestDeliveryForm.reported_date : null;

        if (!latestDeliveryDate) {
          return null;
        }

        const pncServiceFormsAfterLatestDelivery = reports.filter(report => report.reported_date > latestDeliveryDate && report.form === 'pnc_service_form');

        if (pncServiceFormsAfterLatestDelivery.length === 0) {
          return 1;
        }

        const totalVisits = Math.min(pncServiceFormsAfterLatestDelivery.length + 1, Number.MAX_SAFE_INTEGER);

        return totalVisits;
      };

      const totalVisit = totalVisitpnc(allReports);

      context.total_visit = totalVisit;
      context.delivery_date_ctx = deliveryDate;
      context.motherstatus_ctx = motherStatus;
      context.delivery_type = deliveryType;
      context.delivery_since_days_ctx = deliveryDays;

      for (let i = 1; i <= maxNumberOfBabies; i++) {
        context[`baby_name_${i}_ctx`] = deliveryInfo(reports, i - 1, 'baby_name');
        context[`baby_status_${i}_ctx`] = deliveryInfo(reports, i - 1, 'baby_status');
      }
    }
  }
  if (thisContact.contact_type === 'c82_person' && getAge(thisContact) >= 30) {
    const hasNcdRecord = allReports.some(report => ['become_form', 'become_sessions'].includes(report.form));
    if (hasNcdRecord) {
      const latestDeliveryForm = getNewestReport(allReports, 'become_sessions');
      const latestBecomeForm = getNewestReport(allReports, 'become_form');
      const Ebsr_data = getField(latestDeliveryForm, 'ebsr_session.ensure_condition');
      const previous_data = getField(latestBecomeForm, 'become.hp_selection');


      
      context.previous_ctx = previous_data;
      context.ebsr = Ebsr_data;

    }
  }

  return context;
}

const filterRecentNCDReports = (reports) => {
  const today = new Date();
  const thresholdDate = new Date(today.setDate(today.getDate() - 45)); 

  const isRecentReport = (reportDate) => new Date(reportDate) >= thresholdDate;
  const isRelevantForm = (form) => form === 'hypertension_screening' || form === 'diabetes_screening';

  let oldestReport = null;

  for (const report of reports) {
    if (isRelevantForm(report.form) && isRecentReport(report.reported_date)) {
      if (!oldestReport || new Date(report.reported_date) < new Date(oldestReport.reported_date)) {
        oldestReport = report;
      }
    }
  }

  return oldestReport;
};

const ncdBmiCalculation = (reports, field) => {
  const reportData = filterRecentNCDReports(reports);
  return reportData ? getField(reportData, `${reportData.form}.${field}`) : null;
};

const getLatestBloodPressure = (reports, type) => {
  const newestReport = getNewestReport(reports, type);
  const fields = newestReport ? newestReport.fields : {};
  const hypertensionScreening = fields ? fields.hypertension_screening : null;

  return {
    systolic: hypertensionScreening ? hypertensionScreening.systolic_p : null,
    diastolic: hypertensionScreening ? hypertensionScreening.diastolic_p : null,
    average: hypertensionScreening ? hypertensionScreening.avg_p : null,
  };
};

const daysSinceDelivery = (reports) => {
  const deliveryDate = getField(getNewestReport(reports, 'delivery'), 'preg_info.delivery_date');
  return deliveryDate ? moment().diff(moment(deliveryDate), 'days') : null;
};

const getBabyStatus = (reports, index, property) => {
  return getField(getNewestReport(reports, 'delivery'), `bbyinfo.baby_repeat.${index}.baby_details.${property}`);
};

module.exports = {
  today,
  MAX_DAYS_IN_PREGNANCY,
  isHighRiskPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  getSubsequentDeliveries,
  isAlive,
  isPregnant,
  isActivePregnancy,
  countANCFacilityVisits,
  knowsHIVStatusInPast3Months,
  getAllRiskFactors,
  getAllRiskFactorExtra,
  getDangerSignCodes,
  getLatestDangerSignsForPregnancy,
  getNextANCVisitDate,
  getMostRecentLMPDateForPregnancy,
  getMostRecentEDDForPregnancy,
  getDeliveryDate,
  getFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent,
  getField,
  getContext,
  allPlaces,
  allPersons,
  nonHouseholdPlaces,
  nonHouseholdPersons,
  getFieldIfNotSetTo
};
