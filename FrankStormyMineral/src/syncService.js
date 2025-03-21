
import { ref, onValue, set, get } from 'firebase/database';
import { database } from './firebaseConfig';
import * as db from './database';

class SyncService {
  constructor() {
    this.subscribers = [];
    this.lastSync = null;
  }

  initialize() {
    // الاستماع للتغييرات في Firebase
    const dataRef = ref(database, 'restaurant');
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastUpdate > (this.lastSync || 0)) {
        this.importData(data);
      }
    });

    // المزامنة كل 3 ثواني
    setInterval(() => this.sync(), 3000);
  }

  async sync() {
    try {
      const data = await db.exportData();
      const currentTime = Date.now();
      
      await set(ref(database, 'restaurant'), {
        ...data,
        lastUpdate: currentTime
      });
      
      this.lastSync = currentTime;
      this.notifySubscribers();
    } catch (error) {
      console.error('خطأ في المزامنة:', error);
    }
  }

  async importData(data) {
    try {
      if (data.products && data.categories && data.tables && data.transactions) {
        await db.importData(data);
        this.notifySubscribers();
      }
    } catch (error) {
      console.error('خطأ في استيراد البيانات:', error);
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers() {
    this.subscribers.forEach(callback => callback());
  }
}

export default new SyncService();
