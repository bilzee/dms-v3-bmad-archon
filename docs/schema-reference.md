# Prisma Schema Reference

_Auto-generated on 2026-01-12T11:45:38.638Z_

## ReportTemplate

**Fields:**
- `id`
- `name`
- `description`
- `type`
- `layout`
- `createdById`
- `isPublic`
- `createdAt`
- `updatedAt`
- `configurations`
- `createdBy`

## ReportConfiguration

**Fields:**
- `id`
- `templateId`
- `name`
- `filters`
- `aggregations`
- `visualizations`
- `schedule`
- `createdBy`
- `createdAt`
- `creator`
- `template`
- `executions`

## ReportExecution

**Fields:**
- `id`
- `configurationId`
- `status`
- `format`
- `filePath`
- `generatedAt`
- `error`
- `createdAt`
- `configuration`

## User

**Fields:**
- `id`
- `email`
- `username`
- `passwordHash`
- `name`
- `phone`
- `organization`
- `isActive`
- `isLocked`
- `lastLogin`
- `createdAt`
- `updatedAt`
- `auditLogs`
- `entityAssignments`
- `gapFieldSeveritiesCreated`
- `gapFieldSeveritiesUpdated`
- `assessments`
- `responses`
- `reportConfigurations`
- `reportTemplates`
- `roles`

## Role

**Fields:**
- `id`
- `name`
- `description`
- `createdAt`
- `permissions`
- `userRoles`

## UserRole

**Fields:**
- `id`
- `userId`
- `roleId`
- `assignedAt`
- `assignedBy`
- `role`
- `user`

## Permission

**Fields:**
- `id`
- `name`
- `code`
- `category`
- `description`
- `createdAt`
- `roles`

## RolePermission

**Fields:**
- `id`
- `roleId`
- `permissionId`
- `permission`
- `role`

## Entity

**Fields:**
- `id`
- `name`
- `type`
- `location`
- `coordinates`
- `metadata`
- `isActive`
- `autoApproveEnabled`
- `createdAt`
- `updatedAt`
- `commitments`
- `assignments`
- `rapidAssessments`
- `responses`
- `preliminaryAssessments`

## EntityAssignment

**Fields:**
- `id`
- `userId`
- `entityId`
- `assignedAt`
- `assignedBy`
- `entity`
- `user`

## Incident

**Fields:**
- `id`
- `name`
- `type`
- `subType`
- `severity`
- `status`
- `description`
- `location`
- `coordinates`
- `createdBy`
- `createdAt`
- `updatedAt`
- `commitments`
- `preliminaryAssessments`
- `rapidAssessments`

## PreliminaryAssessment

**Fields:**
- `id`
- `reportingDate`
- `reportingLatitude`
- `reportingLongitude`
- `reportingLGA`
- `reportingWard`
- `numberLivesLost`
- `numberInjured`
- `numberDisplaced`
- `numberHousesAffected`
- `numberSchoolsAffected`
- `schoolsAffected`
- `numberMedicalFacilitiesAffected`
- `medicalFacilitiesAffected`
- `estimatedAgriculturalLandsAffected`
- `reportingAgent`
- `additionalDetails`
- `incidentId`
- `createdAt`
- `updatedAt`
- `incident`
- `affectedEntities`

## PreliminaryAssessmentEntity

**Fields:**
- `id`
- `preliminaryAssessmentId`
- `entityId`
- `createdAt`
- `preliminaryAssessment`
- `entity`

## RapidAssessment

**Fields:**
- `id`
- `rapidAssessmentType`
- `rapidAssessmentDate`
- `assessorId`
- `entityId`
- `assessorName`
- `location`
- `coordinates`
- `status`
- `priority`
- `versionNumber`
- `isOfflineCreated`
- `syncStatus`
- `verificationStatus`
- `verifiedAt`
- `verifiedBy`
- `rejectionReason`
- `rejectionFeedback`
- `mediaAttachments`
- `createdAt`
- `updatedAt`
- `gapAnalysis`
- `incidentId`
- `foodAssessment`
- `healthAssessment`
- `populationAssessment`
- `assessor`
- `entity`
- `incident`
- `responses`
- `securityAssessment`
- `shelterAssessment`
- `washAssessment`

## HealthAssessment

**Fields:**
- `rapidAssessmentId`
- `hasFunctionalClinic`
- `hasEmergencyServices`
- `numberHealthFacilities`
- `healthFacilityType`
- `qualifiedHealthWorkers`
- `hasTrainedStaff`
- `hasMedicineSupply`
- `hasMedicalSupplies`
- `hasMaternalChildServices`
- `commonHealthIssues`
- `additionalHealthDetails`
- `rapidAssessment`

## PopulationAssessment

**Fields:**
- `rapidAssessmentId`
- `totalHouseholds`
- `totalPopulation`
- `populationMale`
- `populationFemale`
- `populationUnder5`
- `pregnantWomen`
- `lactatingMothers`
- `personWithDisability`
- `elderlyPersons`
- `separatedChildren`
- `numberLivesLost`
- `numberInjured`
- `additionalPopulationDetails`
- `rapidAssessment`

## FoodAssessment

**Fields:**
- `rapidAssessmentId`
- `isFoodSufficient`
- `hasRegularMealAccess`
- `hasInfantNutrition`
- `foodSource`
- `availableFoodDurationDays`
- `additionalFoodRequiredPersons`
- `additionalFoodRequiredHouseholds`
- `additionalFoodDetails`
- `rapidAssessment`

## WASHAssessment

**Fields:**
- `rapidAssessmentId`
- `waterSource`
- `isWaterSufficient`
- `hasCleanWaterAccess`
- `functionalLatrinesAvailable`
- `areLatrinesSufficient`
- `hasHandwashingFacilities`
- `hasOpenDefecationConcerns`
- `additionalWashDetails`
- `rapidAssessment`

## ShelterAssessment

**Fields:**
- `rapidAssessmentId`
- `areSheltersSufficient`
- `hasSafeStructures`
- `shelterTypes`
- `requiredShelterType`
- `numberSheltersRequired`
- `areOvercrowded`
- `provideWeatherProtection`
- `additionalShelterDetails`
- `rapidAssessment`

## SecurityAssessment

**Fields:**
- `rapidAssessmentId`
- `isSafeFromViolence`
- `gbvCasesReported`
- `hasSecurityPresence`
- `hasProtectionReportingMechanism`
- `vulnerableGroupsHaveAccess`
- `hasLighting`
- `additionalSecurityDetails`
- `rapidAssessment`

## RapidResponse

**Fields:**
- `id`
- `responderId`
- `entityId`
- `assessmentId`
- `type`
- `priority`
- `status`
- `description`
- `resources`
- `timeline`
- `versionNumber`
- `isOfflineCreated`
- `verificationStatus`
- `verifiedAt`
- `verifiedBy`
- `createdAt`
- `updatedAt`
- `donorId`
- `commitmentId`
- `items`
- `offlineId`
- `plannedDate`
- `rejectionFeedback`
- `rejectionReason`
- `responseDate`
- `syncStatus`
- `mediaAttachments`
- `assessment`
- `commitment`
- `donor`
- `entity`
- `responder`
- `conflicts`

## Donor

**Fields:**
- `id`
- `name`
- `type`
- `contactEmail`
- `contactPhone`
- `organization`
- `isActive`
- `createdAt`
- `updatedAt`
- `leaderboardRank`
- `selfReportedDeliveryRate`
- `verifiedDeliveryRate`
- `commitments`
- `responses`

## DonorCommitment

**Fields:**
- `id`
- `donorId`
- `entityId`
- `incidentId`
- `status`
- `items`
- `totalCommittedQuantity`
- `deliveredQuantity`
- `verifiedDeliveredQuantity`
- `commitmentDate`
- `lastUpdated`
- `notes`
- `totalValueEstimated`
- `donor`
- `entity`
- `incident`
- `responses`

## MediaAttachment

**Fields:**
- `id`
- `responseId`
- `filename`
- `originalName`
- `mimeType`
- `fileSize`
- `filePath`
- `thumbnailPath`
- `uploadedAt`
- `uploadedBy`
- `response`

## SyncConflict

**Fields:**
- `id`
- `entityType`
- `entityId`
- `conflictDate`
- `resolutionMethod`
- `winningVersion`
- `losingVersion`
- `resolvedAt`
- `coordinatorNotified`
- `coordinatorNotifiedAt`
- `responseId`
- `response`

## AuditLog

**Fields:**
- `id`
- `userId`
- `action`
- `resource`
- `resourceId`
- `oldValues`
- `newValues`
- `timestamp`
- `ipAddress`
- `userAgent`
- `user`

## GapFieldSeverity

**Fields:**
- `id`
- `fieldName`
- `assessmentType`
- `severity`
- `displayName`
- `description`
- `isActive`
- `createdAt`
- `updatedAt`
- `createdBy`
- `updatedBy`
- `createdByUser`
- `updatedByUser`

