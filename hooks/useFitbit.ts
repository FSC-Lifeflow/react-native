import { FitbitActivityData, FitbitHeartRateData, fitbitService, FitbitSleepData } from '@/services/fitbitService';
import { useCallback, useEffect, useState } from 'react';

export interface FitbitData {
  activity: FitbitActivityData | null;
  heartRate: FitbitHeartRateData | null;
  sleep: FitbitSleepData | null;
}

export function useFitbit() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FitbitData>({
    activity: null,
    heartRate: null,
    sleep: null,
  });
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const connected = await fitbitService.isConnected();
      setIsConnected(connected);
      
      if (connected) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error checking Fitbit connection:', err);
      setError('Failed to check Fitbit connection');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      console.log('📊 Fetching Fitbit data...');
      setIsLoading(true);
      setError(null);

      const [activity, heartRate, sleep] = await Promise.all([
        fitbitService.getTodayActivity(),
        fitbitService.getTodayHeartRate(),
        fitbitService.getTodaySleep(),
      ]);

      console.log('📊 Fitbit data received:', {
        activity: activity ? `${activity.steps} steps, ${activity.calories} cal` : 'null',
        heartRate: heartRate ? `${heartRate.restingHeartRate} bpm` : 'null',
        sleep: sleep ? `${sleep.minutesAsleep} min` : 'null',
      });

      setData({
        activity,
        heartRate,
        sleep,
      });
    } catch (err) {
      console.error('❌ Error fetching Fitbit data:', err);
      setError('Failed to fetch Fitbit data');
    } finally {
      setIsLoading(false);
    }
  };

  const connect = useCallback(async () => {
    try {
      console.log('🔵 useFitbit: Starting connection...');
      setIsLoading(true);
      setError(null);

      console.log('🔵 useFitbit: Calling fitbitService.authorize()...');
      const tokens = await fitbitService.authorize();
      console.log('🔵 useFitbit: authorize() returned:', tokens ? 'tokens received' : 'null');
      
      if (tokens) {
        console.log('✅ useFitbit: Connection successful, fetching data...');
        setIsConnected(true);
        await fetchData();
        return true;
      } else {
        console.log('⚠️ useFitbit: No tokens received (user may have cancelled)');
        setError('Failed to connect to Fitbit');
        return false;
      }
    } catch (err) {
      console.error('❌ useFitbit: Error connecting to Fitbit:', err);
      setError('Failed to connect to Fitbit');
      return false;
    } finally {
      console.log('🔵 useFitbit: Resetting loading state');
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await fitbitService.disconnect();
      setIsConnected(false);
      setData({
        activity: null,
        heartRate: null,
        sleep: null,
      });
      return true;
    } catch (err) {
      console.error('Error disconnecting from Fitbit:', err);
      setError('Failed to disconnect from Fitbit');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isConnected) return;
    await fetchData();
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    data,
    error,
    connect,
    disconnect,
    refresh,
  };
}
