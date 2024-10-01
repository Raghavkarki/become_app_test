const moment = require('moment');
const extras = require('./contact-summary-extras');
const { today, MAX_DAYS_IN_PREGNANCY, isHighRiskPregnancy, getNewestReport,
  getSubsequentPregnancyFollowUps, getSubsequentDeliveries, isAlive, isActivePregnancy, countANCFacilityVisits,
  getAllRiskFactors, getLatestDangerSignsForPregnancy, getNextANCVisitDate,
  getMostRecentLMPDateForPregnancy, getMostRecentEDDForPregnancy, getDeliveryDate,
  getFormArraySubmittedInWindow, getRecentANCVisitWithEvent, getAllRiskFactorExtra, getField, getFieldIfNotSetTo,
  allPlaces, allPersons, getContext } = extras;

//contact, reports, lineage are globally available for contact-summary
const HIDDEN_TYPES_FROM_LINEAGE = ['c10_center', 'c20_province'];
const thisContact = contact;
const thisLineage = lineage.filter((parent) => parent && !HIDDEN_TYPES_FROM_LINEAGE.includes(parent.contact_type));
const allReports = reports;

const context = getContext(thisContact, allReports);
console.log('data', context);


const fields = [
  { appliesToType: 'c82_person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'c82_person', label: 'contact.age', value: thisContact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'c82_person', label: 'contact.gender', value: 'contact.gender.' + (thisContact.gender || thisContact.sex), translate: true, width: 4 },
  { appliesToType: 'c82_person', appliesIf: () => thisContact.parent && thisLineage[0] && thisLineage[0].house_number, label: 'House No.', value: thisLineage && thisLineage[0] && thisLineage[0].house_number, width: 4 },
  { appliesToType: 'c80_household', label: 'person.field.house_number', value: thisContact.house_number, translate: true, width: 4 },
  { appliesToType: allPersons, label: 'person.field.phone', value: thisContact.phone, width: 4 },
  { appliesToType: allPlaces, label: 'Contact', value: thisContact.contact && thisContact.contact.name, width: 4 },
  { appliesToType: allPlaces, label: 'contact.phone.number', value: thisContact.contact && thisContact.contact.phone, width: 4 },
  { label: 'External ID', value: thisContact.external_id, width: 4 },
  { appliesIf: function () { return thisContact.parent && thisLineage[0]; }, label: 'contact.parent', value: thisLineage, filter: 'lineage' },
  { label: 'contact.notes', value: thisContact.notes, width: 12 }
];


const PATIENT_TYPE = 'c82_person';
const cards = [
  {
    label: 'contact.profile.pregnancy.active',
    appliesToType: 'report',
    appliesIf: function (report) { return isActivePregnancy(thisContact, allReports, report); },
    fields: function (report) {
      const fields = [];
      const riskFactors = getAllRiskFactors(allReports, report);
      const riskFactorsCustom = getAllRiskFactorExtra(allReports, report);
      //if (riskFactorCustom) { riskFactors.push(riskFactorCustom); }
      const dangerSigns = getLatestDangerSignsForPregnancy(allReports, report);

      const highRisk = isHighRiskPregnancy(allReports, report);

      const mostRecentANC = getNewestReport(allReports, ['pregnancy', 'pregnancy_home_visit']);
      const mostRecentANCDate = moment(mostRecentANC.reported_date);
      const lmp_date = getMostRecentLMPDateForPregnancy(allReports, report);
      const edd_ms = getMostRecentEDDForPregnancy(allReports, report);
      const nextAncVisitDate = getNextANCVisitDate(allReports, report);
      const weeksPregnant = lmp_date ? today.diff(lmp_date, 'weeks') : null;
      let lmp_approx = getField(report, 'lmp_approx');
      let reportDate = report.reported_date;
      getSubsequentPregnancyFollowUps(allReports, report).forEach(function (followUpReport) {
        //check if LMP was updated
        if (followUpReport.reported_date > reportDate && getField(followUpReport, 'lmp_updated') === 'yes') {
          reportDate = followUpReport.reported_date;
          if (getField(followUpReport, 'lmp_method_approx')) {
            lmp_approx = getField(followUpReport, 'lmp_method_approx');
          }
        }
      });

      const migratedReport = getRecentANCVisitWithEvent(allReports, report, 'migrated');
      const refusedReport = getRecentANCVisitWithEvent(allReports, report, 'refused');
      const stopReport = migratedReport || refusedReport;
      if (stopReport) {
        const clearAll = getField(stopReport, 'pregnancy_ended.clear_option') === 'clear_all';
        fields.push(
          { label: 'contact.profile.change_care', value: migratedReport ? 'contact.profile.clear.migrated' : 'contact.profile.clear.refused', translate: true, width: 6 },
          { label: 'contact.profile.tasks_on_off', value: clearAll ? 'contact.profile.task.on' : 'contact.profile.task.off', translate: true, width: 6 }
        );
      }
      fields.push(
        { label: 'Weeks Pregnant', value: weeksPregnant || weeksPregnant === 0 ? { number: weeksPregnant, approximate: lmp_approx === 'yes' } : 'contact.profile.value.unknown', translate: !weeksPregnant && weeksPregnant !== 0, filter: weeksPregnant || weeksPregnant === 0 ? 'weeksPregnant' : '', width: 6 },
        { label: 'contact.profile.edd', value: edd_ms ? edd_ms.valueOf() : 'contact.profile.value.unknown', translate: !edd_ms, filter: edd_ms ? 'simpleDate' : '', width: 6 }
      );

      if (highRisk) {
        let riskValue = '';
        if (riskFactors.length === 0 && riskFactorsCustom.length > 0) {
          riskValue = riskFactorsCustom.join(', ');
        }
        else if (riskFactors.length + riskFactorsCustom.length > 1) {
          riskValue = 'contact.profile.risk.multiple';
        }
        else if (riskFactors.length === 1) {
          riskValue = 'contact.profile.danger_sign.' + riskFactors[0];
        }
        fields.push(
          { label: 'contact.profile.risk.high', value: riskValue, translate: true, icon: 'icon-pregnancy-danger', width: 6 }
        );
      }

      if (dangerSigns.length > 0) {
        fields.push({ label: 'contact.profile.danger_signs.current', value: dangerSigns.length > 1 ? 'contact.profile.danger_sign.multiple' : 'contact.profile.danger_sign.' + dangerSigns[0], translate: true, width: 6 });
      }

      fields.push(
        { label: 'contact.profile.visit', value: 'contact.profile.visits.of', context: { count: countANCFacilityVisits(allReports, report), total: 4 }, translate: true, width: 6 },
        { label: 'contact.profile.last_visited', value: mostRecentANCDate.valueOf(), filter: 'relativeDay', width: 6 }
      );

      if (nextAncVisitDate && nextAncVisitDate.isSameOrAfter(today)) {
        fields.push(
          { label: 'contact.profile.anc.next', value: nextAncVisitDate.valueOf(), filter: 'simpleDate', width: 6 }
        );
      }

      return fields;
    },
    modifyContext: function (ctx, report) {
      let lmpDate = getField(report, 'lmp_date_8601');
      const eddDate = getField(report, 'g_edd_8601');
      let lmpMethodApprox = getField(report, 'lmp_method_approx');
      let hivTested = getField(report, 'hiv_status_known');
      let dewormingMedicationReceived = getField(report, 'deworming_med_received');
      let ttReceived = getField(report, 'tt_received');
      let ttSecondDoseReceived = getField(report, 'tt_received_second_dose');
      let usingIronFolic = getField(report, 'using_iron_folic');
      let bloodUrineTest = getField(report, 'blood_urine_test');
      let birthPlanSafe = getField(report, 'birth_plan_safe');
      let newBornCard = getField(report, 'newborn_card');
      let xray = getField(report, 'xray');
      let eatMore = getField(report, 'eat_more');
      const riskFactorCodes = getAllRiskFactors(allReports, report);
      const riskFactorsCustom = getAllRiskFactorExtra(allReports, report);
      let pregnancyFollowupDateRecent = getField(report, 't_pregnancy_follow_up_date');
      const isFirstPregnancy = getField(report, 'risk_factors.risk_factor_history.first_pregnancy');
      const followUps = getSubsequentPregnancyFollowUps(allReports, report);
      const ancFacilityVisits = countANCFacilityVisits(allReports, report);
      followUps.forEach(function (followUpReport) {
        if (getField(followUpReport, 'lmp_updated') === 'yes') {
          lmpDate = getField(followUpReport, 'lmp_date_8601');
          lmpMethodApprox = getField(followUpReport, 'lmp_method_approx');
        }
        hivTested = getFieldIfNotSetTo(hivTested, followUpReport, 'hiv_status_known');
        ttReceived = getFieldIfNotSetTo(ttReceived, followUpReport, 'tt_received');
        usingIronFolic = getFieldIfNotSetTo(usingIronFolic, followUpReport, 'using_iron_folic');
        dewormingMedicationReceived = getFieldIfNotSetTo(dewormingMedicationReceived, followUpReport, 'deworming_med_received');
        ttSecondDoseReceived = getFieldIfNotSetTo(ttSecondDoseReceived, followUpReport, 'tt_received_second_dose');
        bloodUrineTest = getFieldIfNotSetTo(bloodUrineTest, followUpReport, 'blood_urine_test');
        xray = getFieldIfNotSetTo(xray, followUpReport, 'xray');
        newBornCard = getFieldIfNotSetTo(newBornCard, followUpReport, 'newborn_card');
        birthPlanSafe = getFieldIfNotSetTo(birthPlanSafe, followUpReport, 'birth_plan_safe');
        eatMore = getFieldIfNotSetTo(eatMore, followUpReport, 'eat_more');
        if (getField(followUpReport, 't_pregnancy_follow_up') === 'yes') { pregnancyFollowupDateRecent = getField(followUpReport, 't_pregnancy_follow_up_date'); }

      });
      ctx.lmp_date_8601 = lmpDate;
      ctx.edd_8601 = eddDate;
      ctx.lmp_method_approx = lmpMethodApprox;
      ctx.is_active_pregnancy = true;
      ctx.deworming_med_received = dewormingMedicationReceived;
      ctx.hiv_tested_past = hivTested;
      ctx.tt_received_past = ttReceived;
      ctx.risk_factor_codes = riskFactorCodes.join(' ');
      ctx.risk_factor_extra = riskFactorsCustom.join('; ');
      ctx.pregnancy_follow_up_date_recent = pregnancyFollowupDateRecent;
      ctx.pregnancy_uuid = report._id;
      ctx.using_iron_folic = usingIronFolic;
      ctx.tt_received_second_dose = ttSecondDoseReceived;
      ctx.is_first_pregnancy = isFirstPregnancy;
      ctx.blood_urine_test = bloodUrineTest;
      ctx.xray = xray;
      ctx.new_born_card = newBornCard;
      ctx.birth_plan_safe = birthPlanSafe;
      ctx.eat_more = eatMore;
      ctx.anc_hf_visits = ancFacilityVisits;
    }
  },

  {
    label: 'contact.profile.death.title',
    appliesToType: 'person',
    appliesIf: function () {
      return !isAlive(thisContact);
    },
    fields: function () {
      const fields = [];
      let dateOfDeath;
      let placeOfDeath;
      const deathReport = getNewestReport(allReports, ['death_report']);
      if (deathReport) {
        const deathDetails = getField(deathReport, 'death_details');
        if (deathDetails) {
          dateOfDeath = deathDetails.date_of_death;
          placeOfDeath = deathDetails.place_of_death;
        }
      }
      else if (thisContact.date_of_death) {
        dateOfDeath = thisContact.date_of_death;
      }
      fields.push(
        { label: 'contact.profile.death.date', value: dateOfDeath ? dateOfDeath : 'contact.profile.value.unknown', filter: dateOfDeath ? 'simpleDate' : '', translate: dateOfDeath ? false : true, width: 6 },
        { label: 'contact.profile.death.place', value: placeOfDeath ? placeOfDeath : 'contact.profile.value.unknown', translate: true, width: 6 }
      );
      return fields;
    }
  },
  {
    label: 'contact.profile.pregnancy.past',
    appliesToType: 'report',
    appliesIf: function (report) {
      if (thisContact.contact_type !== PATIENT_TYPE) { return false; }
      if (report.form === 'delivery') { return true; }
      if (report.form === 'pregnancy') {
        //check if early end to pregnancy (miscarriage/abortion)
        if (getRecentANCVisitWithEvent(allReports, report, 'abortion') || getRecentANCVisitWithEvent(allReports, report, 'miscarriage')) {
          return true;
        }
        //check if 42 weeks past pregnancy and no delivery form submitted
        const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
        return lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, 'weeks')) && getSubsequentDeliveries(allReports, report, MAX_DAYS_IN_PREGNANCY).length === 0;
      }
      return false;
    },
    fields: function (report) {
      const fields = [];
      let relevantPregnancy;
      let dateOfDelivery;
      let placeOfDelivery = '';
      let babiesDelivered = 0;
      let ancFacilityVisits = 0;

      //if there was either a delivery, an early end to pregnancy or 42 weeks have passed
      if (report.form === 'delivery') {
        const deliveryReportDate = moment(report.reported_date);
        relevantPregnancy = getFormArraySubmittedInWindow(allReports, ['pregnancy'], deliveryReportDate.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'days').toDate(), deliveryReportDate.toDate())[0];

        //If there was a delivery
        if (getField(report, 'preg_info')) {
          dateOfDelivery = getDeliveryDate(report);
          placeOfDelivery = `contact.delivery.location.${getField(report, 'preg_info.delivery_place')}`;
          babiesDelivered = getField(report, 'bbyinfo.baby_repeat_count');
          fields.push(
            { label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : '', filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.delivery_place', value: placeOfDelivery, translate: true, width: 6 },
            { label: 'contact.profile.delivered_babies', value: babiesDelivered, width: 6 }
          );
        }
      }
      //if early end to pregnancy
      else if (report.form === 'pregnancy') {
        relevantPregnancy = report;
        const lmpDate = getMostRecentLMPDateForPregnancy(allReports, relevantPregnancy);
        const abortionReport = getRecentANCVisitWithEvent(allReports, relevantPregnancy, 'abortion');
        const miscarriageReport = getRecentANCVisitWithEvent(allReports, relevantPregnancy, 'miscarriage');
        const endReport = abortionReport || miscarriageReport;
        if (endReport) {
          let endReason = '';
          let endDate = moment(0);
          let weeksPregnantAtEnd = 0;
          if (abortionReport) {
            endReason = 'abortion';
            endDate = moment(getField(abortionReport, 'pregnancy_ended.abortion_date'));
          }
          else {
            endReason = 'miscarriage';
            endDate = moment(getField(miscarriageReport, 'pregnancy_ended.miscarriage_date'));
          }

          weeksPregnantAtEnd = endDate.diff(lmpDate, 'weeks');
          fields.push(
            { label: 'contact.profile.pregnancy.end_early', value: endReason, translate: true, width: 6 },
            { label: 'contact.profile.pregnancy.end_date', value: endDate.valueOf(), filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.pregnancy.end_weeks', value: weeksPregnantAtEnd > 0 ? weeksPregnantAtEnd : 'contact.profile.value.unknown', translate: weeksPregnantAtEnd <= 0, width: 6 }
          );
        }
        //if no delivery form and past 42 weeks, display EDD as delivery date
        else if (lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, 'weeks')) && getSubsequentDeliveries(allReports, report, MAX_DAYS_IN_PREGNANCY).length === 0) {
          dateOfDelivery = getMostRecentEDDForPregnancy(allReports, report);
          fields.push({ label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : 'contact.profile.value.unknown', filter: 'simpleDate', translate: dateOfDelivery ? false : true, width: 6 });
        }

      }

      if (relevantPregnancy) {
        ancFacilityVisits = countANCFacilityVisits(allReports, relevantPregnancy);
        fields.push(
          { label: 'contact.profile.anc_visit', value: ancFacilityVisits, width: 3 }
        );

        const highRisk = isHighRiskPregnancy(allReports, relevantPregnancy);
        if (highRisk) {
          let riskValue = '';
          const riskFactors = getAllRiskFactors(allReports, relevantPregnancy);
          const riskFactorsCustom = getAllRiskFactorExtra(allReports, relevantPregnancy);
          if (riskFactors.length === 0 && riskFactorsCustom.length > 0) {
            riskValue = riskFactorsCustom.join(', ');
          }
          else if (riskFactors.length + riskFactorsCustom.length > 1) {
            riskValue = 'contact.profile.risk.multiple';
          }
          else if (riskFactors.length === 1) {
            riskValue = 'contact.profile.danger_sign.' + riskFactors[0];
          }
          fields.push(
            { label: 'contact.profile.risk.high', value: riskValue, translate: true, icon: 'icon-risk', width: 6 }
          );
        }
      }

      return fields;
    }
  }
];

module.exports = {
  context: context,
  cards: cards,
  fields: fields
};
