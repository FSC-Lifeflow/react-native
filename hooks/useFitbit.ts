import { useState, useEffect, useCallback } from 'react';
import { fitbitService, FitbitActivityData, FitbitHeartRateData, FitbitSleepData } from '@/services/fitbitService';

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
      setIsLoading(true);
      setError(null);

      const [activity, heartRate, sleep] = await Promise.all([
        fitbitService.getTodayActivity(),
        fitbitService.getTodayHeartRate(),
        fitbitService.getTodaySleep(),
      ]);

      setData({
        activity,
        heartRate,
        sleep,
      });
    } catch (err) {
      console.error('Error fetching Fitbit data:', err);
      setError('Failed to fetch Fitbit data');
    } finally {
      setIsLoading(false);
    }
  };

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tokens = await fitbitService.authorize();
      
      if (tokens) {
        setIsConnected(true);
        await fetchData();
        return true;
      } else {
        setError('Failed to connect to Fitbit');
        return false;
      }
    } catch (err) {
      console.error('Error connecting to Fitbit:', err);
      setError('Failed to connect to Fitbit');
      return false;
    } finally {
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
