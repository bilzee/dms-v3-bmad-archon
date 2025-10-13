// Test script with real entity ID
const testWithRealEntity = async () => {
  console.log('🧪 Testing assessment creation with real entity ID...');
  
  const testData = {
    rapidAssessmentType: 'HEALTH',
    rapidAssessmentDate: new Date().toISOString(),
    affectedEntityId: 'cmgjht78j003hnyf82f2rxsnz', // Real entity ID from database
    assessorName: 'Test User',
    gpsCoordinates: {
      latitude: 9.0820,
      longitude: 8.6753,
      timestamp: new Date().toISOString(),
      captureMethod: 'GPS'
    },
    photos: [],
    healthAssessment: {
      hasFunctionalClinic: true,
      numberHealthFacilities: 1,
      healthFacilityType: 'Primary Health Centre',
      qualifiedHealthWorkers: 2,
      hasMedicineSupply: true,
      hasMedicalSupplies: true,
      hasMaternalChildServices: false,
      commonHealthIssues: ['Malaria', 'Diarrhea'],
      additionalHealthDetails: { notes: 'Test assessment with real entity' }
    }
  };

  try {
    console.log('📋 Sending assessment with entity ID:', testData.affectedEntityId);
    
    const response = await fetch('http://localhost:3002/api/v1/rapid-assessments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Body:', JSON.stringify(result, null, 2));
    
    if (response.status === 201 && result.success) {
      console.log('🎉 SUCCESS: Assessment created with real entity ID!');
      console.log('   - Assessment ID:', result.data?.id);
      console.log('   - Entity ID:', result.data?.affectedEntityId);
      console.log('   - Assessment Type:', result.data?.rapidAssessmentType);
    } else {
      console.log('❌ Assessment creation failed');
      console.log('   - Status:', response.status);
      console.log('   - Message:', result.message || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
};

testWithRealEntity();