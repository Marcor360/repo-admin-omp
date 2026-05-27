import type { Timestamp } from 'firebase/firestore';

export type AppRole = 'admin' | 'supervisor' | 'user' | string;

export interface AppUser {
  id: string;
  uid: string;
  displayName?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  secondLastName?: string;
  email?: string;
  phone?: string;
  gender?: 'masculino' | 'femenino' | string;
  congregationId?: string;
  congregationDomain?: string;
  role?: AppRole;
  isActive?: boolean;
  isSystemUser?: boolean;
  protectedFromDeletion?: boolean;
  isPrimaryAdmin?: boolean;
  isRootAdmin?: boolean;
  systemProtected?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export type UserFilter = 'all' | 'active' | 'inactive' | 'admins' | 'supervisors' | 'users';

export interface UpdateUserPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  phone?: string;
  gender?: 'masculino' | 'femenino' | '';
  role: AppRole;
  isActive: boolean;
}
