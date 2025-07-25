import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BusinessListingScreen from './src/screens/BusinessListingScreen';
import ValuationScreen from './src/screens/ValuationScreen';
import LoanApplicationScreen from './src/screens/LoanApplicationScreen';

// Import shared components and hooks
import { useAuthStore } from '../../libs/auth/useAuthStore';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={isAuthenticated ? "Dashboard" : "Home"}
            screenOptions={{
              headerStyle: {
                backgroundColor: '#2563eb',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            {!isAuthenticated ? (
              // Auth stack
              <>
                <Stack.Screen 
                  name="Home" 
                  component={HomeScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen}
                  options={{ title: 'Sign In' }}
                />
              </>
            ) : (
              // Main app stack
              <>
                <Stack.Screen 
                  name="Dashboard" 
                  component={DashboardScreen}
                  options={{ title: 'MSMEBazaar' }}
                />
                <Stack.Screen 
                  name="BusinessListing" 
                  component={BusinessListingScreen}
                  options={{ title: 'List Your Business' }}
                />
                <Stack.Screen 
                  name="Valuation" 
                  component={ValuationScreen}
                  options={{ title: 'Business Valuation' }}
                />
                <Stack.Screen 
                  name="LoanApplication" 
                  component={LoanApplicationScreen}
                  options={{ title: 'Loan Application' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}