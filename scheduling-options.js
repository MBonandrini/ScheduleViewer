export const compatibilityProfiles = {
  generic: {label:'Generic CPM / safest', values:{}},
  p6v20: {label:'Primavera P6 20.x compatibility', values:{outOfSequenceMode:'retainedLogic',relationshipLagCalendar:'predecessor',expectedFinishMode:'respect',suspendResumeMode:'respect',externalRelationshipMode:'storedDates',floatMode:'projectFinish'}},
  p6v21_22: {label:'Primavera P6 21–22 compatibility', values:{outOfSequenceMode:'retainedLogic',relationshipLagCalendar:'predecessor',expectedFinishMode:'respect',suspendResumeMode:'respect',externalRelationshipMode:'storedDates',floatMode:'projectFinish'}},
  p6v23_24: {label:'Primavera P6 23–24 compatibility', values:{outOfSequenceMode:'retainedLogic',relationshipLagCalendar:'predecessor',expectedFinishMode:'respect',suspendResumeMode:'respect',externalRelationshipMode:'storedDates',floatMode:'projectFinish'}},
  p6v25_26: {label:'Primavera P6 25–26 compatibility', values:{outOfSequenceMode:'retainedLogic',relationshipLagCalendar:'predecessor',expectedFinishMode:'respect',suspendResumeMode:'respect',externalRelationshipMode:'storedDates',floatMode:'projectFinish'}}
};

export const defaultSchedulingOptions = {
  compatibilityProfile:'generic',
  relationshipLagCalendar:'predecessor',
  outOfSequenceMode:'retainedLogic', // retainedLogic | progressOverride | actualDates
  expectedFinishMode:'respect',      // ignore | respect | constrain
  suspendResumeMode:'respect',       // ignore | respect | strict
  externalRelationshipMode:'storedDates', // ignore | storedDates | warnOnly
  openEndsMode:'normal',             // normal | constrainStart | constrainBoth
  floatMode:'projectFinish',         // projectFinish | finishBy | longestPath
  totalFloatBasis:'finish',          // finish | start | minimum
  calculateMultipleFloatPaths:false,
  useExpectedFinishForCompleted:false,
  calendarExceptionMode:'xerAndOverrides', // xer | overrides | xerAndOverrides
  exceptionOverrides:{},             // {calendarId:{'YYYY-MM-DD': [[480,720],[780,1020]] | []}}
  shiftBoundaryMode:'snap',           // snap | preserveTime
  resourceLevelingEnabled:false,
  resourceLevelingMode:'forward',     // forward | preserveLate
  resourcePriorityField:'priority_type',
  resourceDefaultCapacity:0, // 0 = unlimited unless the XER/resource override provides a capacity
  resourceCapacityOverrides:{},       // {rsrc_id:number}
  resourceCurveMode:'useCurves',      // ignore | useCurves
  levelingMaxIterations:25000,
  levelingGranularityHours:1,
  allowSplitActivities:false,
  levelOnlyWithinFloat:false,
  recalcAfterLeveling:true,
  externalDateFallback:'dataDate',
  strictValidation:true
};

export function normalizeSchedulingOptions(input={}){
  const profile=compatibilityProfiles[input.compatibilityProfile||'generic']||compatibilityProfiles.generic;
  return {...defaultSchedulingOptions,...profile.values,...input,
    exceptionOverrides:{...(input.exceptionOverrides||{})},
    resourceCapacityOverrides:{...(input.resourceCapacityOverrides||{})}
  };
}

export function applyProfile(options,profileId){
  const profile=compatibilityProfiles[profileId]||compatibilityProfiles.generic;
  return normalizeSchedulingOptions({...options,...profile.values,compatibilityProfile:profileId});
}
