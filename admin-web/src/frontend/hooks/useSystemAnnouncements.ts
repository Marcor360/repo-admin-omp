import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebase/firebase';
import { useAuth } from '../auth/useAuth';
import type { SystemAnnouncement } from '../types/announcement.types';

export function useSystemAnnouncements() {
  const { user } = useAuth();
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      if (!user || !db) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'systemAnnouncements'),
          where('active', '==', true),
          where('target', 'in', ['all', 'web']),
          orderBy('priority', 'desc')
        );

        const snapshot = await getDocs(q);
        const now = Date.now();
        
        let selected: SystemAnnouncement | null = null;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as SystemAnnouncement;
          
          // Check dates locally because Firestore limits multiple inequalities
          const startsAt = (data.startsAt as any)?._seconds * 1000 || 0;
          const endsAt = data.endsAt ? (data.endsAt as any)?._seconds * 1000 : null;

          if (startsAt > now || (endsAt && endsAt < now)) {
            continue;
          }

          // Check if already viewed
          if (data.showOnce) {
            const viewRef = doc(db, 'users', user.email, 'viewedAnnouncements', docSnap.id);
            const viewSnap = await getDoc(viewRef);
            if (viewSnap.exists()) {
              continue;
            }
          }

          selected = { ...data, id: docSnap.id };
          break;
        }

        setActiveAnnouncement(selected);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchAnnouncements();
  }, [user]);

  async function markAsViewed(announcementId: string) {
    if (!user || !db) return;
    try {
      const viewRef = doc(db, 'users', user.email, 'viewedAnnouncements', announcementId);
      await setDoc(viewRef, {
        viewedAt: serverTimestamp()
      });
      setActiveAnnouncement(null);
    } catch (err) {
      console.error('Error marking announcement as viewed:', err);
      // Even if it fails, hide it for the current session to avoid annoying the user
      setActiveAnnouncement(null);
    }
  }

  return { activeAnnouncement, loading, markAsViewed };
}
