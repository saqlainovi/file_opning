import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isLocalSandbox: boolean;
  signInWithGoogle: () => Promise<void>;
  signInSandbox: (emailInput?: string) => Promise<void>;
  signInWithCredentials: (usernameInput: string, passwordInput: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocalSandbox, setIsLocalSandbox] = useState(false);

  useEffect(() => {
    // Check if local sandbox was previously enabled
    const wasSandbox = localStorage.getItem('local_sandbox_enabled') === 'true';
    if (wasSandbox) {
      const savedEmail = localStorage.getItem('local_sandbox_email') || 'ovi.softt@gmail.com';
      setIsLocalSandbox(true);
      
      const customUsername = localStorage.getItem('custom_login_username');
      if (customUsername === 'ovi.it') {
        setUser({
          uid: 'local-sandbox-user',
          email: 'ovi.it',
          displayName: 'Super Admin (Ovi)',
          emailVerified: true,
          photoURL: ''
        } as any);
        setUserProfile({
          uid: 'local-sandbox-user',
          email: 'ovi.it',
          displayName: 'Super Admin (Ovi)',
          photoURL: '',
          designation: 'Super Admin',
          role: 'Admin'
        });
      } else if (customUsername) {
        const savedDisplayName = localStorage.getItem('custom_login_displayName') || 'Admin Officer';
        const savedDesignation = localStorage.getItem('custom_login_designation') || 'Admin';
        const savedPermissionsStr = localStorage.getItem('custom_login_permissions');
        const savedPermissions = savedPermissionsStr ? JSON.parse(savedPermissionsStr) : undefined;
        setUser({
          uid: 'local-sandbox-user',
          email: customUsername,
          displayName: savedDisplayName,
          emailVerified: true,
          photoURL: ''
        } as any);
        setUserProfile({
          uid: 'local-sandbox-user',
          email: customUsername,
          displayName: savedDisplayName,
          photoURL: '',
          designation: savedDesignation,
          role: 'Admin',
          permissions: savedPermissions
        });
      } else {
        setUser({
          uid: 'local-sandbox-user',
          email: savedEmail,
          displayName: 'Demo Sandbox Admin',
          emailVerified: true,
          photoURL: ''
        } as any);
        setUserProfile({
          uid: 'local-sandbox-user',
          email: savedEmail,
          displayName: 'Demo Sandbox Admin',
          photoURL: '',
          designation: 'Super Admin',
          role: 'Admin'
        });
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.isAnonymous) {
          const customUsername = localStorage.getItem('custom_login_username');
          if (customUsername === 'ovi.it') {
            setUserProfile({
              uid: currentUser.uid,
              email: 'ovi.it',
              displayName: 'Super Admin (Ovi)',
              photoURL: '',
              designation: 'Super Admin',
              role: 'Admin'
            });
            setLoading(false);
            return;
          } else if (customUsername) {
            const savedDisplayName = localStorage.getItem('custom_login_displayName') || 'Admin Officer';
            const savedDesignation = localStorage.getItem('custom_login_designation') || 'Admin';
            const savedPermissionsStr = localStorage.getItem('custom_login_permissions');
            const savedPermissions = savedPermissionsStr ? JSON.parse(savedPermissionsStr) : undefined;
            setUserProfile({
              uid: currentUser.uid,
              email: customUsername,
              displayName: savedDisplayName,
              photoURL: '',
              designation: savedDesignation,
              role: 'Admin',
              permissions: savedPermissions
            });
            setLoading(false);
            return;
          }

          // Fallback anonymous user profile
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || 'ovi.softt@gmail.com',
            displayName: currentUser.displayName || 'Sandbox Admin',
            photoURL: currentUser.photoURL || '',
            designation: 'Super Admin',
            role: 'Admin'
          });
          setLoading(false);
          return;
        }

        const customUsername = localStorage.getItem('custom_login_username');
        if (customUsername && currentUser.email?.endsWith('@admin.local')) {
          if (customUsername === 'ovi.it') {
            setUserProfile({
              uid: currentUser.uid,
              email: 'ovi.it',
              displayName: 'Super Admin (Ovi)',
              photoURL: '',
              designation: 'Super Admin',
              role: 'Admin'
            });
            setLoading(false);
            return;
          } else {
             const savedDisplayName = localStorage.getItem('custom_login_displayName') || 'Admin Officer';
             const savedDesignation = localStorage.getItem('custom_login_designation') || 'Admin';
             const savedPermissionsStr = localStorage.getItem('custom_login_permissions');
             const savedPermissions = savedPermissionsStr ? JSON.parse(savedPermissionsStr) : undefined;
             setUserProfile({
               uid: currentUser.uid,
               email: customUsername,
               displayName: savedDisplayName,
               photoURL: '',
               designation: savedDesignation,
               role: 'Admin',
               permissions: savedPermissions
             });
             setLoading(false);
             return;
          }
        }

        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Enforce role = 'Contributor' for Google authenticated users, so they cannot edit!
            setUserProfile({
              ...data,
              role: 'Contributor'
            });
          } else {
            // Create user profile on first login with role = 'Contributor'
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'System User',
              photoURL: currentUser.photoURL || '',
              designation: 'Contributor',
              role: 'Contributor',
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error reading or creating user profile:", error);
          // Fallback for google auth error - set role to Contributor
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'System User',
            photoURL: currentUser.photoURL || '',
            designation: 'Contributor',
            role: 'Contributor'
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    localStorage.removeItem('local_sandbox_enabled');
    localStorage.removeItem('local_sandbox_email');
    localStorage.removeItem('custom_login_username');
    localStorage.removeItem('custom_login_displayName');
    localStorage.removeItem('custom_login_designation');
    localStorage.removeItem('custom_login_role');
    setIsLocalSandbox(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error("Google Sign-In Error:", error);
      }
      throw error;
    }
  };

  const signInSandbox = async (emailInput?: string) => {
    try {
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
    } catch (err) {
      console.warn("Anonymous sign-in failed, falling back to local sandbox:", err);
      setIsLocalSandbox(true);
      const email = emailInput || 'ovi.softt@gmail.com';
      setUser({
        uid: 'local-sandbox-user',
        email: email,
        displayName: 'Demo Sandbox Admin',
        emailVerified: true,
        photoURL: ''
      } as any);
      setUserProfile({
        uid: 'local-sandbox-user',
        email: email,
        displayName: 'Demo Sandbox Admin',
        photoURL: '',
        designation: 'Super Admin',
        role: 'Admin'
      });
      localStorage.setItem('local_sandbox_enabled', 'true');
      localStorage.setItem('local_sandbox_email', email);
    }
  };

  const signInWithCredentials = async (usernameInput: string, passwordInput: string) => {
    localStorage.removeItem('local_sandbox_enabled');
    localStorage.removeItem('local_sandbox_email');
    localStorage.removeItem('custom_login_username');
    localStorage.removeItem('custom_login_displayName');
    localStorage.removeItem('custom_login_designation');
    localStorage.removeItem('custom_login_role');
    setIsLocalSandbox(false);

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();
    const authEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@admin.local`;
    const firebasePassword = cleanPassword.padEnd(6, '0');

    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut: authSignOut, deleteUser } = await import('firebase/auth');
      let credential;
      
      try {
        credential = await signInWithEmailAndPassword(auth, authEmail, firebasePassword);
      } catch (innerErr: any) {
        // Auto-migration check: If user not found or invalid credential, let's see if they are in admin_users
        if (innerErr.code === 'auth/invalid-credential' || innerErr.code === 'auth/user-not-found' || innerErr.code === 'auth/wrong-password') {
           // Special case for Super Admin
           if (cleanUsername === 'ovi.it' && cleanPassword === '5656') {
             credential = await createUserWithEmailAndPassword(auth, authEmail, firebasePassword);
           } else {
             // We need to be authenticated to read admin_users, so we sign in anonymously first
             let anonCred;
             try {
               anonCred = await signInAnonymously(auth);
               let adminDocRef = doc(db, 'admin_users', cleanUsername);
               let docSnap = await getDoc(adminDocRef);
               
               if (docSnap.exists() && docSnap.data().password === cleanPassword) {
                 // Valid! We can create their account. 
                 // First, delete the anonymous user so it doesn't leave garbage.
                 await deleteUser(anonCred.user);
                 
                 // Now create their actual account
                 credential = await createUserWithEmailAndPassword(auth, authEmail, firebasePassword);
               } else {
                 await deleteUser(anonCred.user);
                 throw innerErr; // Re-throw if password doesn't match or not found
               }
             } catch (readErr) {
               if (anonCred) await deleteUser(anonCred.user).catch(() => {});
               throw innerErr;
             }
           }
        } else {
           throw innerErr;
        }
      }

      // Now fetch their profile from users or admin_users
      // Admin users are stored in admin_users by their original username
      let adminDocRef = doc(db, 'admin_users', cleanUsername);
      let docSnap = await getDoc(adminDocRef);

      if (!docSnap.exists()) {
         // Fallback to checking by uid if needed, or maybe it's just ovi.it
         if (cleanUsername === 'ovi.it') {
            localStorage.setItem('custom_login_username', 'ovi.it');
            localStorage.setItem('custom_login_displayName', 'Super Admin (Ovi)');
            localStorage.setItem('custom_login_designation', 'Super Admin');
            localStorage.setItem('custom_login_role', 'Admin');

          const profile: UserProfile = {
            uid: credential.user.uid,
            email: 'ovi.it',
            displayName: 'Super Admin (Ovi)',
            photoURL: '',
            designation: 'Super Admin',
            role: 'Admin'
          };
          setUser(credential.user);
          setUserProfile(profile);
          try {
             await setDoc(doc(db, 'users', credential.user.uid), profile);
          } catch(e) { console.error("Could not write super admin to users collection", e); }
          return;
       }
    }

    if (docSnap.exists()) {
      const data = docSnap.data();
      localStorage.setItem('custom_login_username', cleanUsername);
      localStorage.setItem('custom_login_displayName', data.displayName || 'Admin Officer');
      localStorage.setItem('custom_login_designation', data.designation || 'Admin');
      localStorage.setItem('custom_login_role', 'Admin');
      if (data.permissions) {
        localStorage.setItem('custom_login_permissions', JSON.stringify(data.permissions));
      } else {
        localStorage.removeItem('custom_login_permissions');
      }

      const profile: UserProfile = {
        uid: credential.user.uid,
        email: cleanUsername,
        displayName: data.displayName || 'Admin Officer',
        photoURL: '',
        designation: data.designation || 'Admin',
        role: 'Admin'
      };
      if (data.permissions !== undefined) {
        profile.permissions = data.permissions;
      }
      setUser(credential.user);
      setUserProfile(profile);
      try {
         await setDoc(doc(db, 'users', credential.user.uid), profile);
      } catch(e) { console.error("Could not write admin to users collection", e); }
      return;
    }

      throw new Error("ইউজার ডাটাবেসে পাওয়া যায়নি। (User not found in database.)");
    } catch (error: any) {
      console.warn("Real Firestore check failed or skipped, trying offline sandbox list:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
         // let it fall through to offline sandbox check, it will throw at the end if not found
         // throw new Error("ইউজার আইডি বা পাসওয়ার্ড ভুল হয়েছে। (Incorrect User ID or Password.)");
      }
      
      // If it's a network error, maybe fallback to offline
      console.log("Falling back to local auth check...", error);
    }

    // 3. Fallback: Check offline sandbox list
    const localAdmins = JSON.parse(localStorage.getItem('local_admin_users') || '[]');
    const matchedLocal = localAdmins.find((u: any) => u.username === cleanUsername && u.password === cleanPassword);
    if (matchedLocal) {
      setIsLocalSandbox(true);
      localStorage.setItem('local_sandbox_enabled', 'true');
      localStorage.setItem('local_sandbox_email', cleanUsername);
      localStorage.setItem('custom_login_username', cleanUsername);
      localStorage.setItem('custom_login_displayName', matchedLocal.displayName);
      localStorage.setItem('custom_login_designation', matchedLocal.designation);
      localStorage.setItem('custom_login_role', 'Admin');
      if (matchedLocal.permissions) {
        localStorage.setItem('custom_login_permissions', JSON.stringify(matchedLocal.permissions));
      } else {
        localStorage.removeItem('custom_login_permissions');
      }

      setUser({
        uid: 'local-sandbox-user',
        email: cleanUsername,
        displayName: matchedLocal.displayName,
        emailVerified: true,
        photoURL: ''
      } as any);
      setUserProfile({
        uid: 'local-sandbox-user',
        email: cleanUsername,
        displayName: matchedLocal.displayName,
        photoURL: '',
        designation: matchedLocal.designation,
        role: 'Admin',
        permissions: matchedLocal.permissions
      });
      return;
    }

    // Not found anywhere
    throw new Error("ইউজার আইডি বা পাসওয়ার্ড ভুল হয়েছে। (Incorrect User ID or Password.)");
  };

  const logout = async () => {
    localStorage.removeItem('local_sandbox_enabled');
    localStorage.removeItem('local_sandbox_email');
    localStorage.removeItem('custom_login_username');
    localStorage.removeItem('custom_login_displayName');
    localStorage.removeItem('custom_login_designation');
    localStorage.removeItem('custom_login_role');
    localStorage.removeItem('custom_login_permissions');
    setIsLocalSandbox(false);
    setUser(null);
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (isLocalSandbox) {
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return;
    }
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, updates);
      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isLocalSandbox, signInWithGoogle, signInSandbox, signInWithCredentials, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
