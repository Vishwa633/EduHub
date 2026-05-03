import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "../../hooks/useColors";
import { useAuthStore } from "../../store/authStore";
import { API_URL } from "../../constants/api";
function UserAvatar({ uri, size = 80, borderRadius }) {
  const r = borderRadius ?? size / 2;
  const isReal = typeof uri === "string" && uri.trim().length > 0 && !uri.includes("dicebear.com");
  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden",
      backgroundColor: "#b0b3b8", alignItems: "center", justifyContent: "center" }}>
      {isReal
        ? <Image source={{ uri }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" />
        : <Ionicons name="person" size={size * 0.6} color="#ffffff" />}
    </View>
  );
}

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const FALLBACK_COLORS = {
  primary: "#EC407A",
  textPrimary: "#7d2150",
  textSecondary: "#b06a8f",
  textDark: "#5a1836",
  placeholderText: "#767676",
  background: "#ffffff",
  cardBackground: "#fff5f8",
  inputBackground: "#fef8fa",
  border: "#f8bbd0",
  white: "#ffffff",
  black: "#000000",
};

const toSafeText = (value) => String(value ?? "");

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  return [0, 30].map((minute) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = String(minute).padStart(2, "0");
    return `${displayHour}:${displayMinute} ${period}`;
  });
}).flat();

const DEFAULT_AVAILABILITY = WEEK_DAYS.map((day) => ({
  day,
  isAvailable: false,
  from: "09:00 AM",
  to: "05:00 PM",
}));

const timeToMinutes = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
  if (!match) return Number.NaN;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return Number.NaN;

  if (hour === 12) {
    hour = period === "AM" ? 0 : 12;
  } else if (period === "PM") {
    hour += 12;
  }

  return hour * 60 + minute;
};

const isValidPhoneNumber = (phone) => {
  const normalized = toSafeText(phone).trim().replace(/\s+/g, "");
  return /^(07\d{8}|\+947\d{8}|947\d{8})$/.test(normalized);
};

function InputField({ label, icon, colors, containerStyle, ...inputProps }) {
  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      <Text
        style={{
          fontSize: 14,
          marginBottom: 8,
          color: colors.textPrimary,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 10 }} />
        ) : null}

        <TextInput
          style={{ flex: 1, height: 48, fontSize: 16, color: colors.textDark }}
          placeholderTextColor={colors.placeholderText}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function PickerField({ label, icon, colors, selectedValue, onValueChange, items, prompt }) {
  const [showModal, setShowModal] = useState(false);
  
  const selectedItem = (items || []).find(i => String(i.value) === String(selectedValue));
  const displayText = selectedItem ? selectedItem.label : prompt || "Select...";

  if (Platform.OS === 'ios') {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, marginBottom: 8, color: colors.textPrimary, fontWeight: "500" }}>{label}</Text>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => setShowModal(true)}
          style={{
            backgroundColor: colors.inputBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            height: 52,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
          }}
        >
          {icon && <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 10 }} />}
          <Text style={{ flex: 1, fontSize: 16, color: selectedValue ? colors.textDark : colors.placeholderText }}>
            {displayText}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.placeholderText} />
        </TouchableOpacity>

        <Modal visible={showModal} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: 16, 
                borderBottomWidth: 1, 
                borderBottomColor: colors.border 
              }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>{label}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={selectedValue}
                onValueChange={(value) => {
                  onValueChange(toSafeText(value));
                  if (Platform.OS === 'android') setShowModal(false);
                }}
                itemStyle={{ color: colors.textDark, fontSize: 20 }}
              >
                {items.map((item) => (
                  <Picker.Item key={`${label}-${item.value}`} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 14,
          marginBottom: 8,
          color: colors.textPrimary,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>

      <View
        style={{
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          height: 52,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", height: 52, paddingLeft: 12 }}>
          {icon ? (
            <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 8 }} />
          ) : null}

          <Picker
            selectedValue={selectedValue}
            onValueChange={(value) => onValueChange(toSafeText(value))}
            style={{
              flex: 1,
              color: selectedValue ? colors.textDark : colors.placeholderText,
              height: 52,
              marginTop: Platform.OS === "android" ? -2 : 0,
            }}
            itemStyle={{ color: colors.textDark, fontSize: 16 }}
            dropdownIconColor={colors.primary}
            mode="dropdown"
            prompt={prompt}
          >
            {items.map((item) => (
              <Picker.Item key={`${label}-${item.value}`} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

export default function Signup() {
  const router = useRouter();
  const hookColors = useColors();
  const isLoading = useAuthStore((state) => state.isLoading);
  const register = useAuthStore((state) => state.register);

  const colors = useMemo(
    () => ({
      ...FALLBACK_COLORS,
      ...(hookColors || {}),
    }),
    [hookColors],
  );

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [role, setRole] = useState("student");
  const [tutorStep, setTutorStep] = useState(1);
  const intendedRoleRef = useRef("student");

  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("");
  const [bio, setBio] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [age, setAge] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("");
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [profileImage, setProfileImage] = useState("");
  const [documentType, setDocumentType] = useState("nic");
  const [nicNumber, setNicNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [nicFrontImage, setNicFrontImage] = useState("");
  const [nicBackImage, setNicBackImage] = useState("");
  const [passportImage, setPassportImage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const successRedirectTimeoutRef = useRef(null);

  const [publicSubjects, setPublicSubjects] = useState([]);
  const [customSubject, setCustomSubject] = useState("");

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`${API_URL}/subjects/public`);
        if (response.ok) {
          const data = await response.json();
          setPublicSubjects(data || []);
        }
      } catch (err) {
        console.error("Error fetching public subjects:", err);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    return () => {
      if (successRedirectTimeoutRef.current) {
        clearTimeout(successRedirectTimeoutRef.current);
      }
    };
  }, []);

  const toggleAvailabilityDay = (day) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? {
              ...slot,
              isAvailable: !slot.isAvailable,
              from: slot.from || "09:00 AM",
              to: slot.to || "05:00 PM",
            }
          : slot,
      ),
    );
  };

  const updateAvailabilityTime = (day, field, value) => {
    const safeValue = toSafeText(value);
    setAvailability((current) =>
      current.map((slot) => (slot.day === day ? { ...slot, [field]: safeValue } : slot)),
    );
  };

  const showValidationError = (message) => {
    setSuccessMessage("");
    setValidationError(message);
    Alert.alert("Error", message);
  };

  const pickImage = async (setter) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || "image/jpeg";
        setter(`data:${mimeType};base64,${asset.base64}`);
      } else if (asset.uri) {
        setter(asset.uri);
      }
    } catch (_error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const isValidSriLankanNic = (value) => {
    const normalized = toSafeText(value).trim();
    return /^(\d{9}[vVxX]|\d{12})$/.test(normalized);
  };

  const handleTutorNext = () => {
    if (tutorStep === 1) {
      if (!fullName || !subject || !mobileNumber || !experienceLevel || !age || !price || !priceType) {
        showValidationError("Please complete Step 1 fields before continuing");
        return;
      }

      const ageNum = Number.parseInt(age, 10);
      if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
        showValidationError("Please enter a valid age between 1 and 100");
        return;
      }

      const priceNum = Number.parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        showValidationError("Please enter a valid price greater than 0");
        return;
      }

      if (!isValidPhoneNumber(mobileNumber)) {
        showValidationError("Please enter a valid phone number (07XXXXXXXX or +947XXXXXXXX)");
        return;
      }

      if (!["per_hour", "per_session"].includes(priceType)) {
        showValidationError("Please select a valid price type");
        return;
      }

      if (!["beginner", "intermediate", "expert"].includes(experienceLevel)) {
        showValidationError("Please select a valid experience level");
        return;
      }

      if (fullName.trim().length < 3) {
        showValidationError("Please enter your full name");
        return;
      }

      if (subject === "Other" && customSubject.trim().length < 2) {
        showValidationError("Please enter your proposed subject");
        return;
      }

      if (subject !== "Other" && subject.trim().length < 2) {
        showValidationError("Please select a subject");
        return;
      }

      setValidationError("");
      setTutorStep(2);
      return;
    }

    if (tutorStep === 2) {
      const selectedAvailability = availability.filter((slot) => slot.isAvailable);
      if (selectedAvailability.length === 0) {
        showValidationError("Please select at least one availability day before continuing");
        return;
      }

      const invalidAvailability = selectedAvailability.find((slot) => {
        const fromMinutes = timeToMinutes(slot.from);
        const toMinutes = timeToMinutes(slot.to);
        return Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
      });

      if (invalidAvailability) {
        showValidationError(`Please select a valid time range for ${invalidAvailability.day}`);
        return;
      }

      if (bio.trim().length < 10) {
        showValidationError("Bio must be at least 10 characters");
        return;
      }

      setValidationError("");
      setTutorStep(3);
      return;
    }

    if (!profileImage) {
      showValidationError("Profile photo is required");
      return;
    }

    if (documentType === "nic") {
      if (!isValidSriLankanNic(nicNumber)) {
        showValidationError("Please enter a valid NIC number");
        return;
      }

      if (!nicFrontImage || !nicBackImage) {
        showValidationError("NIC front and back images are required");
        return;
      }
    } else {
      if (!passportNumber.trim()) {
        showValidationError("Passport number is required");
        return;
      }

      if (!passportImage) {
        showValidationError("Passport image is required");
        return;
      }
    }

    setValidationError("");
  };

  const handleSignUp = async () => {
    try {
      setSuccessMessage("");
      setValidationError("");
      const effectiveRole = intendedRoleRef.current || role;
      if (effectiveRole === "tutor" && tutorStep < 3) {
        handleTutorNext();
        return;
      }

      const safeUsername = toSafeText(username).trim();
      const safeEmail = toSafeText(email).trim();
      const safePassword = toSafeText(password);

      if (!safeUsername || !safeEmail || !safePassword) {
        showValidationError("Please fill in all required fields");
        return;
      }

      if (safeUsername.length < 3) {
        showValidationError("Username must be at least 3 characters");
        return;
      }

      if (safePassword.length < 6) {
        showValidationError("Password must be at least 6 characters");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(safeEmail)) {
        showValidationError("Please enter a valid email address");
        return;
      }

      const payload = {
        username: safeUsername,
        email: safeEmail,
        password: safePassword,
        role: effectiveRole,
      };

      if (effectiveRole === "tutor") {
        const selectedAvailability = availability.filter((slot) => slot.isAvailable);

        if (
          !fullName ||
          !subject ||
          !bio ||
          !mobileNumber ||
          !experienceLevel ||
          !age ||
          !price ||
          !priceType ||
          selectedAvailability.length === 0
        ) {
          showValidationError("Please fill in all tutor details and select at least one availability day");
          return;
        }

        const invalidAvailability = selectedAvailability.find((slot) => {
          const fromMinutes = timeToMinutes(slot.from);
          const toMinutes = timeToMinutes(slot.to);
          return Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
        });

        if (invalidAvailability) {
          showValidationError(`Please select a valid time range for ${invalidAvailability.day}`);
          return;
        }

        const ageNum = Number.parseInt(age, 10);
        if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
          showValidationError("Please enter a valid age between 1 and 100");
          return;
        }

        const priceNum = Number.parseFloat(price);
        if (Number.isNaN(priceNum) || priceNum <= 0) {
          showValidationError("Please enter a valid price greater than 0");
          return;
        }

        if (!isValidPhoneNumber(mobileNumber)) {
          showValidationError("Please enter a valid phone number (07XXXXXXXX or +947XXXXXXXX)");
          return;
        }

        if (!["per_hour", "per_session"].includes(priceType)) {
          showValidationError("Please select a valid price type");
          return;
        }

        if (!["beginner", "intermediate", "expert"].includes(experienceLevel)) {
          showValidationError("Please select a valid experience level");
          return;
        }

        if (fullName.trim().length < 3) {
          showValidationError("Please enter your full name");
          return;
        }

        if (subject === "Other" && customSubject.trim().length < 2) {
          showValidationError("Please enter your proposed subject");
          return;
        }

        if (subject !== "Other" && subject.trim().length < 2) {
          showValidationError("Please select a subject");
          return;
        }

        if (bio.trim().length < 10) {
          showValidationError("Bio must be at least 10 characters");
          return;
        }

        if (!profileImage) {
          showValidationError("Profile photo is required");
          return;
        }

        if (documentType === "nic") {
          if (!isValidSriLankanNic(nicNumber)) {
            showValidationError("Please enter a valid NIC number");
            return;
          }

          if (!nicFrontImage || !nicBackImage) {
            showValidationError("NIC front and back images are required");
            return;
          }
        } else {
          if (!passportNumber.trim()) {
            showValidationError("Passport number is required");
            return;
          }

          if (!passportImage) {
            showValidationError("Passport image is required");
            return;
          }
        }

        payload.tutorProfile = {
          fullName: fullName.trim(),
          subject: subject === "Other" ? customSubject.trim() : subject.trim(),
          bio: bio.trim(),
          mobileNumber: mobileNumber.trim(),
          experienceLevel,
          age: ageNum,
          price: priceNum,
          priceType,
          availability: selectedAvailability.map((slot) => ({
            day: slot.day,
            from: slot.from,
            to: slot.to,
            isAvailable: true,
          })),
          kyc: {
            documentType,
            nicNumber: documentType === "nic" ? nicNumber.trim() : "",
            passportNumber: documentType === "passport" ? passportNumber.trim() : "",
            nicFrontImage: documentType === "nic" ? nicFrontImage : "",
            nicBackImage: documentType === "nic" ? nicBackImage : "",
            passportImage: documentType === "passport" ? passportImage : "",
          },
        };

        payload.profileImage = profileImage;
      }

      const result = await register(safeUsername, safeEmail, safePassword, payload);
      if (!result?.success) {
        showValidationError(result?.error || "Registration failed. Please try again.");
        return;
      }

      const tutorPendingMessage = "Tutor account submitted. Admin review and activation usually takes 1-2 days.";
      const successText = effectiveRole === "tutor"
        ? (result?.data?.message || tutorPendingMessage)
        : "Account created successfully. Redirecting to login...";

      setValidationError("");
      setSuccessMessage(successText);

      if (Platform.OS !== "web") {
        Alert.alert("Success", successText);
      }

      if (successRedirectTimeoutRef.current) {
        clearTimeout(successRedirectTimeoutRef.current);
      }

      successRedirectTimeoutRef.current = setTimeout(() => {
        router.replace("/(auth)");
      }, 1200);
    } catch (error) {
      console.error("[SIGNUP] handleSignUp error:", error);
      showValidationError("Something went wrong during sign up. Please try again.");
    }
  };

  const handlePrimaryAction = () => {
    const effectiveRole = intendedRoleRef.current || role;
    if (effectiveRole === "tutor" && tutorStep < 3) {
      handleTutorNext();
      return;
    }
    handleSignUp();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}
      >
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 24,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
            borderWidth: 2,
            borderColor: colors.border,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: colors.textPrimary,
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              EduHub
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
              Join as a Student or Tutor
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 14,
                marginBottom: 12,
                color: colors.textPrimary,
                fontWeight: "500",
              }}
            >
              Select Your Role
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  intendedRoleRef.current = "student";
                  setRole("student");
                  setTutorStep(1);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: role === "student" ? colors.primary : colors.border,
                  backgroundColor: role === "student" ? colors.cardBackground : colors.inputBackground,
                  opacity: role === "student" ? 1 : 0.7,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={role === "student" ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: role === "student" ? "700" : "500",
                    color: role === "student" ? colors.primary : colors.textSecondary,
                  }}
                >
                  Student
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  intendedRoleRef.current = "tutor";
                  setRole("tutor");
                  setTutorStep(1);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: role === "tutor" ? colors.primary : colors.border,
                  backgroundColor: role === "tutor" ? colors.cardBackground : colors.inputBackground,
                  opacity: role === "tutor" ? 1 : 0.7,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={role === "tutor" ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: role === "tutor" ? "700" : "500",
                    color: role === "tutor" ? colors.primary : colors.textSecondary,
                  }}
                >
                  Tutor
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <InputField
            label="Username"
            icon="person-outline"
            colors={colors}
            placeholder="alex_smith"
            value={username}
            onChangeText={(text) => setUsername(toSafeText(text))}
            autoCapitalize="none"
          />

          <InputField
            label="Email"
            icon="mail-outline"
            colors={colors}
            placeholder="alex@example.com"
            value={email}
            onChangeText={(text) => setEmail(toSafeText(text))}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                marginBottom: 8,
                color: colors.textPrimary,
                fontWeight: "500",
              }}
            >
              Password
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.inputBackground,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />

              <TextInput
                style={{ flex: 1, height: 48, fontSize: 16, color: colors.textDark }}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholderText}
                value={password}
                onChangeText={(text) => setPassword(toSafeText(text))}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {role === "tutor" ? (
            <View
              style={{
                marginBottom: 20,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
                  Tutor Details
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  {`Step ${tutorStep} of 3`}
                </Text>
              </View>

              {tutorStep === 1 ? (
                <>
                  <InputField
                    label="Full Name"
                    icon="person-circle-outline"
                    colors={colors}
                    placeholder="Kusalya Methpani"
                    value={fullName}
                    onChangeText={(text) => setFullName(toSafeText(text))}
                  />

                  <PickerField
                    key={`subject-picker-${publicSubjects.length}`}
                    label="Subject"
                    icon="book-outline"
                    colors={colors}
                    selectedValue={subject}
                    onValueChange={setSubject}
                    prompt="Select Subject"
                    items={[
                      { label: "Select Subject", value: "" },
                      ...(Array.isArray(publicSubjects) ? publicSubjects : []).map((s) => ({ 
                        label: String(s?.name || s || "Unknown"), 
                        value: String(s?.name || s || "Unknown") 
                      })),
                      { label: "Other (Please specify)", value: "Other" },
                    ]}
                  />

                  {subject === "Other" && (
                    <InputField
                      label="Proposed Subject"
                      icon="add-circle-outline"
                      colors={colors}
                      placeholder="e.g., Advanced Mathematics"
                      value={customSubject}
                      onChangeText={(text) => setCustomSubject(toSafeText(text))}
                    />
                  )}

                  <InputField
                    label="Mobile Number"
                    icon="call-outline"
                    colors={colors}
                    placeholder="071 234 5678"
                    value={mobileNumber}
                    onChangeText={(text) => setMobileNumber(toSafeText(text))}
                    keyboardType="phone-pad"
                  />

                  <InputField
                    label="Age"
                    icon="calendar-outline"
                    colors={colors}
                    placeholder="e.g., 28"
                    value={age}
                    onChangeText={(text) => setAge(toSafeText(text).replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                  />

                  <View
                    style={{
                      marginBottom: 16,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 10,
                        color: colors.textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Pricing
                    </Text>

                    <InputField
                      label="Price"
                      icon="cash-outline"
                      colors={colors}
                      placeholder="1500"
                      value={price}
                      onChangeText={(text) => setPrice(toSafeText(text).replace(/[^0-9.]/g, ""))}
                      keyboardType="decimal-pad"
                      containerStyle={{ marginBottom: 12 }}
                    />

                    <PickerField
                      label="Price Type"
                      icon="pricetags-outline"
                      colors={colors}
                      selectedValue={priceType}
                      onValueChange={setPriceType}
                      prompt="Select Price Type"
                      items={[
                        { label: "Select Price Type", value: "" },
                        { label: "Per Session", value: "per_session" },
                      ]}
                    />
                  </View>

                  <PickerField
                    label="Experience Level"
                    icon="briefcase-outline"
                    colors={colors}
                    selectedValue={experienceLevel}
                    onValueChange={setExperienceLevel}
                    prompt="Select Experience Level"
                    items={[
                      { label: "Select Experience Level", value: "" },
                      { label: "Beginner (0-2 years)", value: "beginner" },
                      { label: "Intermediate (3-5 years)", value: "intermediate" },
                      { label: "Expert (6+ years)", value: "expert" },
                    ]}
                  />
                </>
              ) : tutorStep === 2 ? (
                <>
                  <View
                    style={{
                      marginBottom: 16,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 6,
                        color: colors.textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Availability
                    </Text>

                    <Text style={{ fontSize: 12, marginBottom: 12, color: colors.textSecondary }}>
                      Select the days you can teach and set a time range for each day.
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {availability.map((slot) => {
                        const selected = slot.isAvailable;
                        return (
                          <TouchableOpacity
                            key={slot.day}
                            onPress={() => toggleAvailabilityDay(slot.day)}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : colors.inputBackground,
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? colors.white : colors.textPrimary,
                                fontWeight: "700",
                                fontSize: 12,
                              }}
                            >
                              {slot.day.slice(0, 3)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {availability.some((slot) => slot.isAvailable) ? (
                      availability
                        .filter((slot) => slot.isAvailable)
                        .map((slot) => (
                          <View
                            key={slot.day}
                            style={{
                              marginBottom: 12,
                              paddingBottom: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "700",
                                color: colors.textPrimary,
                                marginBottom: 8,
                              }}
                            >
                              {slot.day}
                            </Text>

                            <View style={{ flexDirection: "row", gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    marginBottom: 6,
                                    color: colors.textSecondary,
                                    fontWeight: "500",
                                  }}
                                >
                                  From
                                </Text>

                                <View
                                  style={{
                                    backgroundColor: colors.inputBackground,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    overflow: "hidden",
                                  }}
                                >
                                  <Picker
                                    selectedValue={slot.from}
                                    onValueChange={(value) =>
                                      updateAvailabilityTime(slot.day, "from", value)
                                    }
                                    style={{ height: 50, color: colors.textDark }}
                                    dropdownIconColor={colors.primary}
                                    mode="dropdown"
                                  >
                                    {TIME_OPTIONS.map((timeOption) => (
                                      <Picker.Item
                                        key={`from-${slot.day}-${timeOption}`}
                                        label={timeOption}
                                        value={timeOption}
                                      />
                                    ))}
                                  </Picker>
                                </View>
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    marginBottom: 6,
                                    color: colors.textSecondary,
                                    fontWeight: "500",
                                  }}
                                >
                                  To
                                </Text>

                                <View
                                  style={{
                                    backgroundColor: colors.inputBackground,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    overflow: "hidden",
                                  }}
                                >
                                  <Picker
                                    selectedValue={slot.to}
                                    onValueChange={(value) =>
                                      updateAvailabilityTime(slot.day, "to", value)
                                    }
                                    style={{ height: 50, color: colors.textDark }}
                                    dropdownIconColor={colors.primary}
                                    mode="dropdown"
                                  >
                                    {TIME_OPTIONS.map((timeOption) => (
                                      <Picker.Item
                                        key={`to-${slot.day}-${timeOption}`}
                                        label={timeOption}
                                        value={timeOption}
                                      />
                                    ))}
                                  </Picker>
                                </View>
                              </View>
                            </View>
                          </View>
                        ))
                    ) : (
                      <View
                        style={{
                          backgroundColor: colors.inputBackground,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: 12,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          No days selected yet. Tap a day above to add availability.
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 8,
                        color: colors.textPrimary,
                        fontWeight: "500",
                      }}
                    >
                      Bio
                    </Text>

                    <TextInput
                      style={{
                        backgroundColor: colors.inputBackground,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        minHeight: 100,
                        color: colors.textDark,
                        fontSize: 14,
                      }}
                      placeholder="Passionate about teaching with 5 years of experience..."
                      placeholderTextColor={colors.placeholderText}
                      value={bio}
                      onChangeText={(text) => setBio(toSafeText(text))}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingVertical: 10,
                      marginTop: 4,
                      marginBottom: 8,
                    }}
                    onPress={() => setTutorStep(1)}
                  >
                    <Text style={{ textAlign: "center", color: colors.textPrimary, fontWeight: "600" }}>
                      Back to Step 1
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View
                    style={{
                      marginBottom: 16,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 10,
                        color: colors.textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Profile Photo (Required)
                    </Text>

                    <TouchableOpacity
                      onPress={() => pickImage(setProfileImage)}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: colors.inputBackground,
                        alignItems: "center",
                      }}
                    >
                      {profileImage ? (
                        <Image
                          source={{ uri: profileImage }}
                          style={{ width: "100%", height: 180, borderRadius: 10 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={{ alignItems: "center", justifyContent: "center", height: 180 }}>
                          <UserAvatar
                            uri=""
                            size={72}
                            borderRadius={36}
                          />
                          <Text style={{ color: colors.textSecondary, fontWeight: "600", marginTop: 12 }}>
                            Tap to upload profile photo
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      marginBottom: 16,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        marginBottom: 10,
                        color: colors.textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Identity Verification
                    </Text>

                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => setDocumentType("nic")}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: documentType === "nic" ? colors.primary : colors.border,
                          borderRadius: 10,
                          paddingVertical: 10,
                          backgroundColor: documentType === "nic" ? colors.cardBackground : colors.inputBackground,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: documentType === "nic" ? colors.primary : colors.textSecondary,
                            fontWeight: "700",
                          }}
                        >
                          NIC
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setDocumentType("passport")}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: documentType === "passport" ? colors.primary : colors.border,
                          borderRadius: 10,
                          paddingVertical: 10,
                          backgroundColor: documentType === "passport" ? colors.cardBackground : colors.inputBackground,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: documentType === "passport" ? colors.primary : colors.textSecondary,
                            fontWeight: "700",
                          }}
                        >
                          Passport
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {documentType === "nic" ? (
                      <>
                        <InputField
                          label="NIC Number"
                          icon="card-outline"
                          colors={colors}
                          placeholder="200012345678"
                          value={nicNumber}
                          onChangeText={(text) => setNicNumber(toSafeText(text).trim())}
                          autoCapitalize="characters"
                        />

                        <TouchableOpacity
                          onPress={() => pickImage(setNicFrontImage)}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 12,
                            backgroundColor: colors.inputBackground,
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          {nicFrontImage ? (
                            <Image
                              source={{ uri: nicFrontImage }}
                              style={{ width: "100%", height: 150, borderRadius: 10 }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                              Upload NIC Front Image
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => pickImage(setNicBackImage)}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 12,
                            backgroundColor: colors.inputBackground,
                            alignItems: "center",
                          }}
                        >
                          {nicBackImage ? (
                            <Image
                              source={{ uri: nicBackImage }}
                              style={{ width: "100%", height: 150, borderRadius: 10 }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                              Upload NIC Back Image
                            </Text>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <InputField
                          label="Passport Number"
                          icon="newspaper-outline"
                          colors={colors}
                          placeholder="e.g., N1234567"
                          value={passportNumber}
                          onChangeText={(text) => setPassportNumber(toSafeText(text).trim())}
                          autoCapitalize="characters"
                        />

                        <TouchableOpacity
                          onPress={() => pickImage(setPassportImage)}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 12,
                            backgroundColor: colors.inputBackground,
                            alignItems: "center",
                          }}
                        >
                          {passportImage ? (
                            <Image
                              source={{ uri: passportImage }}
                              style={{ width: "100%", height: 160, borderRadius: 10 }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                              Upload Passport Image
                            </Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingVertical: 10,
                      marginTop: 4,
                      marginBottom: 8,
                    }}
                    onPress={() => setTutorStep(2)}
                  >
                    <Text style={{ textAlign: "center", color: colors.textPrimary, fontWeight: "600" }}>
                      Back to Step 2
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}

          {validationError ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#f5c2c7",
                backgroundColor: "#fff1f3",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: "#b42318", fontSize: 13, fontWeight: "600" }}>{validationError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#b7ebc6",
                backgroundColor: "#ecfdf3",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginTop: validationError ? 10 : 0,
              }}
            >
              <Text style={{ color: "#027a48", fontSize: 13, fontWeight: "600" }}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 12,
              marginVertical: 16,
            }}
            onPress={handlePrimaryAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.white,
                  textAlign: "center",
                }}
              >
                {(intendedRoleRef.current || role) === "tutor" && tutorStep < 3 ? "Next" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 16,
            }}
          >
            <Text style={{ color: colors.textSecondary }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.primary, fontWeight: "600", marginLeft: 4 }}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
