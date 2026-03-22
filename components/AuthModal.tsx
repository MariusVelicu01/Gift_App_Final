<<<<<<< HEAD
import React, { useMemo, useState } from "react";
=======
import React, { useMemo, useState } from 'react';
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
<<<<<<< HEAD
} from "react-native";
import { useAuth } from "../src/context/AuthContext";
import type { AppRole } from "../src/types/user";
=======
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import type { AppRole } from '../src/types/user';
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c

type Props = {
  visible: boolean;
  onClose: () => void;
};

<<<<<<< HEAD
type AuthTab = "login" | "register";

const initialRegisterState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  role: "client" as AppRole,
  email: "",
  password: "",
  confirmPassword: "",
=======
type AuthTab = 'login' | 'register';

const initialRegisterState = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  role: 'client' as AppRole,
  email: '',
  password: '',
  confirmPassword: '',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
};

export default function AuthModal({ visible, onClose }: Props) {
  const { login, register, resetPassword } = useAuth();

<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
=======
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c

  const [registerForm, setRegisterForm] = useState(initialRegisterState);

  const title = useMemo(
<<<<<<< HEAD
    () => (activeTab === "login" ? "Autentificare" : "Creare cont"),
    [activeTab],
=======
    () => (activeTab === 'login' ? 'Autentificare' : 'Creare cont'),
    [activeTab]
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
  );

  const updateRegisterField = (
    field: keyof typeof initialRegisterState,
<<<<<<< HEAD
    value: string,
=======
    value: string
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
  ) => {
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await login(loginEmail, loginPassword);
<<<<<<< HEAD
      Alert.alert("Succes", "Te-ai conectat cu succes.");
      onClose();
    } catch (error) {
      Alert.alert(
        "Eroare",
        error instanceof Error ? error.message : "Login eșuat.",
      );
=======
      Alert.alert('Succes', 'Te-ai conectat cu succes.');
      onClose();
    } catch (error) {
      Alert.alert('Eroare', error instanceof Error ? error.message : 'Login eșuat.');
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
<<<<<<< HEAD
    console.log("handleRegister started");
    console.log("registerForm:", registerForm);

    try {
      setSubmitting(true);
      console.log("calling register...");
      await register(registerForm);
      console.log("register success");

      Alert.alert("Succes", "Contul a fost creat cu succes.");
      onClose();
      setRegisterForm(initialRegisterState);
    } catch (error) {
      console.error("REGISTER UI ERROR:", error);

      Alert.alert(
        "Eroare",
        error instanceof Error ? error.message : "Înregistrarea a eșuat.",
      );
    } finally {
      setSubmitting(false);
      console.log("handleRegister finished");
=======
    try {
      setSubmitting(true);
      await register(registerForm);
      Alert.alert('Succes', 'Contul a fost creat cu succes.');
      onClose();
      setRegisterForm(initialRegisterState);
    } catch (error) {
      Alert.alert(
        'Eroare',
        error instanceof Error ? error.message : 'Înregistrarea a eșuat.'
      );
    } finally {
      setSubmitting(false);
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
    }
  };

  const handleForgotPassword = async () => {
    try {
      setSubmitting(true);
      await resetPassword(loginEmail);
      Alert.alert(
<<<<<<< HEAD
        "Email trimis",
        "Verifică adresa de email pentru resetarea parolei.",
      );
    } catch (error) {
      Alert.alert(
        "Eroare",
        error instanceof Error ? error.message : "Resetarea parolei a eșuat.",
=======
        'Email trimis',
        'Verifică adresa de email pentru resetarea parolei.'
      );
    } catch (error) {
      Alert.alert(
        'Eroare',
        error instanceof Error ? error.message : 'Resetarea parolei a eșuat.'
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
<<<<<<< HEAD
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
=======
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Închide</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
<<<<<<< HEAD
              style={[
                styles.tabButton,
                activeTab === "login" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("login")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "login" && styles.activeTabText,
                ]}
              >
=======
              style={[styles.tabButton, activeTab === 'login' && styles.activeTabButton]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                Login
              </Text>
            </Pressable>

            <Pressable
<<<<<<< HEAD
              style={[
                styles.tabButton,
                activeTab === "register" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("register")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "register" && styles.activeTabText,
                ]}
=======
              style={[styles.tabButton, activeTab === 'register' && styles.activeTabButton]}
              onPress={() => setActiveTab('register')}
            >
              <Text
                style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
<<<<<<< HEAD
            {activeTab === "login" ? (
=======
            {activeTab === 'login' ? (
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                />

                <Text style={styles.label}>Parolă</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />

                <Pressable
<<<<<<< HEAD
                  style={[
                    styles.primaryButton,
                    submitting && styles.disabledButton,
                  ]}
=======
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                  onPress={handleLogin}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Login</Text>
                  )}
                </Pressable>

                <Pressable onPress={handleForgotPassword} disabled={submitting}>
                  <Text style={styles.linkText}>Forgot Password</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>Nume</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nume"
                  value={registerForm.firstName}
<<<<<<< HEAD
                  onChangeText={(value) =>
                    updateRegisterField("firstName", value)
                  }
=======
                  onChangeText={(value) => updateRegisterField('firstName', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Prenume</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Prenume"
                  value={registerForm.lastName}
<<<<<<< HEAD
                  onChangeText={(value) =>
                    updateRegisterField("lastName", value)
                  }
=======
                  onChangeText={(value) => updateRegisterField('lastName', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Data nașterii</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={registerForm.dateOfBirth}
<<<<<<< HEAD
                  onChangeText={(value) =>
                    updateRegisterField("dateOfBirth", value)
                  }
=======
                  onChangeText={(value) => updateRegisterField('dateOfBirth', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Gen</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masculin / Feminin / Altul"
                  value={registerForm.gender}
<<<<<<< HEAD
                  onChangeText={(value) => updateRegisterField("gender", value)}
=======
                  onChangeText={(value) => updateRegisterField('gender', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Rol</Text>
                <View style={styles.radioRow}>
                  <Pressable
                    style={[
                      styles.roleButton,
<<<<<<< HEAD
                      registerForm.role === "client" && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField("role", "client")}
=======
                      registerForm.role === 'client' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField('role', 'client')}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                  >
                    <Text
                      style={[
                        styles.roleText,
<<<<<<< HEAD
                        registerForm.role === "client" && styles.roleTextActive,
=======
                        registerForm.role === 'client' && styles.roleTextActive,
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                      ]}
                    >
                      Client
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.roleButton,
<<<<<<< HEAD
                      registerForm.role === "admin" && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField("role", "admin")}
=======
                      registerForm.role === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField('role', 'admin')}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                  >
                    <Text
                      style={[
                        styles.roleText,
<<<<<<< HEAD
                        registerForm.role === "admin" && styles.roleTextActive,
=======
                        registerForm.role === 'admin' && styles.roleTextActive,
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                      ]}
                    >
                      Administrator
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={registerForm.email}
<<<<<<< HEAD
                  onChangeText={(value) => updateRegisterField("email", value)}
=======
                  onChangeText={(value) => updateRegisterField('email', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Parolă</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  secureTextEntry
                  value={registerForm.password}
<<<<<<< HEAD
                  onChangeText={(value) =>
                    updateRegisterField("password", value)
                  }
=======
                  onChangeText={(value) => updateRegisterField('password', value)}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                />

                <Text style={styles.label}>Confirmă parola</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirmă parola"
                  secureTextEntry
                  value={registerForm.confirmPassword}
<<<<<<< HEAD
                  onChangeText={(value) =>
                    updateRegisterField("confirmPassword", value)
                  }
                />

                <Pressable
                  style={[
                    styles.primaryButton,
                    submitting && styles.disabledButton,
                  ]}
                  onPress={() => {
                    console.log("REGISTER BUTTON PRESSED");
                    handleRegister();
                  }}
=======
                  onChangeText={(value) => updateRegisterField('confirmPassword', value)}
                />

                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleRegister}
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Înregistrare</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    maxHeight: "90%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  closeText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
=======
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
    marginTop: 14,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tabText: {
    color: "#111827",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
=======
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: {
    color: '#111827',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
  },
  form: {
    gap: 10,
    paddingBottom: 20,
  },
  label: {
    fontSize: 13,
<<<<<<< HEAD
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#fff",
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
=======
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
<<<<<<< HEAD
    color: "#fff",
    fontWeight: "700",
=======
    color: '#fff',
    fontWeight: '700',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
    fontSize: 15,
  },
  linkText: {
    marginTop: 8,
<<<<<<< HEAD
    color: "#2563eb",
    fontWeight: "600",
    textAlign: "center",
  },
  radioRow: {
    flexDirection: "row",
=======
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  radioRow: {
    flexDirection: 'row',
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
    gap: 10,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  roleText: {
    color: "#111827",
    fontWeight: "600",
  },
  roleTextActive: {
    color: "#2563eb",
  },
});
=======
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleText: {
    color: '#111827',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#2563eb',
  },
});
>>>>>>> a87b865ff20c0db0e296917c6a720c6c87944d1c
