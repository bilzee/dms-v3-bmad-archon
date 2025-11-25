# Prisma Schema Reference

_Auto-generated on 2025-11-25T22:05:42.239Z_

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
- `assessments`
- `responses`
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
- `assignments`
- `rapidAssessments`
- `responses`
- `commitments`

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
- `preliminaryAssessments`
- `rapidAssessments`
- `commitments`

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

## RapidAssessment

**Fields:**
- `id`
- `rapidAssessmentType`
- `rapidAssessmentDate`
- `assessorId`
- `entityId`
- `incidentId`
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
- `gapAnalysis`
- `createdAt`
- `updatedAt`
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
- `donor`
- `commitment`
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
- `selfReportedDeliveryRate`
- `verifiedDeliveryRate`
- `leaderboardRank`
- `createdAt`
- `updatedAt`
- `responses`
- `commitments`

## DonorCommitment

**Fields:**
- `id`
- `donorId`
- `entityId`
- `incidentId`
- `status`
- `items`

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

