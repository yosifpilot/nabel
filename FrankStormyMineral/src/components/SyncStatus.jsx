
import React, { useState, useEffect } from 'react';
import syncManager from '../syncManager';

const SyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState(syncManager.getSyncStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // تحديث حالة المزامنة كل ثانية
    const interval = setInterval(() => {
      setSyncStatus(syncManager.getSyncStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    try {
      await syncManager.manualSync();
      setSyncStatus(syncManager.getSyncStatus());
    } catch (error) {
      console.error("خطأ في المزامنة اليدوية:", error);
    }
  };

  return (
    <div className="sync-status-container">
      <div className="sync-status-indicator" onClick={() => setShowDetails(!showDetails)}>
        <div className={`sync-status-dot ${syncStatus.isOnline ? 'online' : 'offline'}`}></div>
        <div className="sync-status-text">
          {syncStatus.isSyncing ? 'جاري المزامنة...' : 
            syncStatus.isOnline ? 'متصل' : 'غير متصل'}
        </div>
      </div>
      
      {showDetails && (
        <div className="sync-status-details">
          <div className="sync-details-row">
            <span>آخر مزامنة:</span>
            <span>{syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'لم تتم المزامنة'}</span>
          </div>
          <div className="sync-details-row">
            <span>معرف الجهاز:</span>
            <span>{syncStatus.deviceId}</span>
          </div>
          <button 
            className="sync-now-button" 
            onClick={handleManualSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          >
            مزامنة الآن
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
import React, { useState, useEffect } from 'react';
import syncManager from '../syncManager';
import '../styles/SyncStatus.css';

export default function SyncStatus() {
  const [status, setStatus] = useState(syncManager.getSyncStatus());
  
  useEffect(() => {
    // تحديث حالة المزامنة كل 5 ثوانٍ
    const interval = setInterval(() => {
      setStatus(syncManager.getSyncStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleSyncNow = () => {
    syncManager.sync();
    setStatus(syncManager.getSyncStatus());
  };
  
  return (
    <div className="sync-status">
      <div className={`status-indicator ${status.isOnline ? 'online' : 'offline'}`}></div>
      <div className="status-text">
        {status.isActive ? (
          status.isOnline ? 'متصل ومتزامن' : 'غير متصل (سيتم المزامنة عند الاتصال)'
        ) : 'المزامنة غير مفعلة'}
      </div>
      {status.pendingChangesCount > 0 && (
        <div className="pending-changes">
          {status.pendingChangesCount} تغييرات معلقة
        </div>
      )}
      <button 
        className="sync-now-btn" 
        onClick={handleSyncNow}
        disabled={!status.isActive || !status.isOnline}
      >
        مزامنة الآن
      </button>
    </div>
  );
}
import { useState, useEffect } from 'react';
import syncService from '../syncService.js';
import '../styles/SyncStatus.css';

function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState({
    syncInProgress: false,
    pendingChanges: false
  });

  useEffect(() => {
    // الاشتراك في تحديثات حالة المزامنة
    const unsubscribe = syncService.addListener(status => {
      setSyncStatus(status);
    });

    // إلغاء الاشتراك عند تفكيك المكون
    return () => unsubscribe();
  }, []);

  // مزامنة يدوية عند النقر على الزر
  const handleSyncClick = async () => {
    if (window.db && window.db.syncNow) {
      try {
        await window.db.syncNow();
      } catch (error) {
        console.error('خطأ في المزامنة اليدوية:', error);
      }
    }
  };

  return (
    <div className="sync-status">
      <div className="status-row">
        <div className={`status-indicator ${syncStatus.syncInProgress ? 'offline' : 'online'}`}></div>
        <span className="status-text">
          {syncStatus.syncInProgress ? 'جاري المزامنة...' : 'متصل'}
        </span>
        {syncStatus.pendingChanges && (
          <span className="pending-changes">تغييرات معلقة</span>
        )}
        <button 
          className="sync-now-btn" 
          onClick={handleSyncClick} 
          disabled={syncStatus.syncInProgress}
        >
          مزامنة الآن
        </button>
      </div>
    </div>
  );
}

export default SyncStatus;
