import { useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
  const match = String(time || "").trim().match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
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
  const normalized = String(phone || "").trim().replace(/\s+/g, "");
  return /^(07\d{8}|\+947\d{8}|947\d{8})$/.test(normalized);
};

function InputField({ label, icon, value, onChangeText, colors, error, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, marginBottom: 8, color: colors.textPrimary, fontWeight: "500" }}>{label}</Text>
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
        {icon ? <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 10 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={{ flex: 1, height: 48, fontSize: 16, color: colors.textPrimary }}
          placeholderTextColor={colors.placeholderText}
          {...props}
        />
      </View>
      {error ? <Text style={{ color: "#b42318", marginTop: 6, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

function PickerField({ label, icon, selectedValue, onValueChange, items, colors }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, marginBottom: 8, color: colors.textPrimary, fontWeight: "500" }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingLeft: 12,
          overflow: "hidden",
          height: 52,
        }}
      >
        {icon ? <Ionicons name={icon} size={20} color={colors.primary} style={{ marginRight: 8 }} /> : null}
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={{
            flex: 1,
            color: selectedValue ? colors.textPrimary : colors.placeholderText,
            height: 52,
            marginTop: Platform.OS === "android" ? -2 : 0,
          }}
          dropdownIconColor={colors.primary}
        >
          {items.map((item) => (
            <Picker.Item key={`${label}-${item.value}`} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const COLORS = useColors();
  const { user, updateProfile } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("");
  const [bio, setBio] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [age, setAge] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("");
  const [availability, setAvailability] = useState(DEFAULT_AVAILABILITY);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || "");
    setEmail(user.email || "");
    setProfileImage(user.profileImage || "");
    setFullName(user?.tutorProfile?.fullName || "");
    setSubject(user?.tutorProfile?.subject || "");
    setBio(user?.tutorProfile?.bio || "");
    setMobileNumber(user?.tutorProfile?.mobileNumber || "");
    setExperienceLevel(user?.tutorProfile?.experienceLevel || "");
    setAge(user?.tutorProfile?.age ? String(user.tutorProfile.age) : "");
    setPrice(user?.tutorProfile?.price ? String(user.tutorProfile.price) : "");
    setPriceType(user?.tutorProfile?.priceType || "");

    const savedAvailability = Array.isArray(user?.tutorProfile?.availability)
      ? user.tutorProfile.availability
      : [];

    const mergedAvailability = DEFAULT_AVAILABILITY.map((slot) => {
      const existing = savedAvailability.find((s) => s?.day === slot.day);
      if (!existing) return slot;
      return {
        day: slot.day,
        isAvailable: true,
        from: existing.from || slot.from,
        to: existing.to || slot.to,
      };
    });
    setAvailability(mergedAvailability);
  }, [user]);

  const toggleAvailabilityDay = (day) => {
    setAvailability((current) =>
      current.map((slot) =>
        slot.day === day
          ? { ...slot, isAvailable: !slot.isAvailable, from: slot.from || "09:00 AM", to: slot.to || "05:00 PM" }
          : slot,
      ),
    );
  };

  const updateAvailabilityTime = (day, field, value) => {
    setAvailability((current) =>
      current.map((slot) => (slot.day === day ? { ...slot, [field]: String(value || "") } : slot)),
    );
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType || "image/jpeg";
        setProfileImage(`data:${mimeType};base64,${asset.base64}`);
      } else if (asset.uri) {
        setProfileImage(asset.uri);
      }
    } catch (_error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const getValidationErrors = ({ includeStep2 = false } = {}) => {
    const errors = {};
    const isTutor = user?.role === "tutor";
    const safeUsername = String(username || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();

    if (!safeUsername) {
      errors.username = "Username is required";
    } else if (safeUsername.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!safeEmail) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(safeEmail)) {
      errors.email = "Please enter a valid email address";
    }

    if (isTutor) {
      const safePhone = String(mobileNumber || "").trim();
      const ageNum = Number.parseInt(String(age || ""), 10);

      if (!safePhone) {
        errors.mobileNumber = "Phone number is required";
      } else if (!isValidPhoneNumber(safePhone)) {
        errors.mobileNumber = "Use 07XXXXXXXX or +947XXXXXXXX";
      }

      if (!String(age || "").trim()) {
        errors.age = "Age is required";
      } else if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
        errors.age = "Enter age between 1 and 100";
      }

      if (!String(fullName || "").trim()) {
        errors.fullName = "Full name is required";
      }

      if (!String(subject || "").trim()) {
        errors.subject = "Subject is required";
      }
    }

    if (includeStep2) {
      if (newPassword || confirmPassword) {
        if (String(newPassword || "").length < 6) {
          errors.newPassword = "Password must be at least 6 characters";
        }
        if (newPassword !== confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
      }

      if (isTutor) {
        if (String(bio || "").trim().length < 10) {
          errors.bio = "Bio must be at least 10 characters";
        }

        const selectedAvailability = availability.filter((slot) => slot.isAvailable);
        if (selectedAvailability.length === 0) {
          errors.availability = "Select at least one availability day";
        }

        const invalidAvailability = selectedAvailability.find((slot) => {
          const fromMinutes = timeToMinutes(slot.from);
          const toMinutes = timeToMinutes(slot.to);
          return Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
        });

        if (invalidAvailability) {
          errors.availability = `Invalid time range for ${invalidAvailability.day}`;
        }
      }
    }

    return errors;
  };

  const showFirstError = (errors) => {
    const firstMessage = Object.values(errors || {})[0];
    if (firstMessage) {
      Alert.alert("Error", firstMessage);
    }
  };

  const handleSaveProfile = async () => {
    const isTutor = user?.role === "tutor";
    const validationErrors = getValidationErrors({ includeStep2: true });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      showFirstError(validationErrors);
      return;
    }

    setFieldErrors({});
    const safeUsername = String(username || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();

    if (!safeUsername || !safeEmail) {
      Alert.alert("Error", "Username and email are required");
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
    }

    if (safeUsername.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (isTutor) {
      if (!isValidPhoneNumber(mobileNumber)) {
        Alert.alert("Error", "Please enter a valid phone number (07XXXXXXXX or +947XXXXXXXX)");
        return;
      }

      if (!["beginner", "intermediate", "expert"].includes(String(experienceLevel || ""))) {
        Alert.alert("Error", "Please select a valid experience level");
        return;
      }

      const ageNum = Number.parseInt(String(age || ""), 10);
      if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
        Alert.alert("Error", "Please enter a valid age between 1 and 100");
        return;
      }

      const priceNum = Number.parseFloat(String(price || ""));
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        Alert.alert("Error", "Please enter a valid price greater than 0");
        return;
      }

      if (!["per_hour", "per_session"].includes(String(priceType || ""))) {
        Alert.alert("Error", "Please select a valid price type");
        return;
      }

      if (String(fullName || "").trim().length < 3) {
        Alert.alert("Error", "Please enter a valid full name");
        return;
      }

      if (String(subject || "").trim().length < 2) {
        Alert.alert("Error", "Please enter a valid subject");
        return;
      }

      if (String(bio || "").trim().length < 10) {
        Alert.alert("Error", "Bio must be at least 10 characters");
        return;
      }

      const selectedAvailability = availability.filter((slot) => slot.isAvailable);
      if (selectedAvailability.length === 0) {
        Alert.alert("Error", "Please select at least one availability day");
        return;
      }

      const invalidAvailability = selectedAvailability.find((slot) => {
        const fromMinutes = timeToMinutes(slot.from);
        const toMinutes = timeToMinutes(slot.to);
        return Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
      });

      if (invalidAvailability) {
        Alert.alert("Error", `Please select a valid time range for ${invalidAvailability.day}`);
        return;
      }
    }

    const payload = {
      username: safeUsername,
      email: safeEmail,
      profileImage,
    };

    if (newPassword) {
      payload.password = newPassword;
    }

    if (isTutor) {
      payload.tutorProfile = {
        fullName: String(fullName || "").trim(),
        subject: String(subject || "").trim(),
        bio: String(bio || "").trim(),
        mobileNumber: String(mobileNumber || "").trim(),
        experienceLevel: String(experienceLevel || "").trim(),
        age: String(age || "").trim(),
        price: String(price || "").trim(),
        priceType: String(priceType || "").trim(),
        availability: availability
          .filter((slot) => slot.isAvailable)
          .map((slot) => ({ day: slot.day, from: slot.from, to: slot.to, isAvailable: true })),
      };
    }

    try {
      setIsSavingProfile(true);
      const result = await updateProfile(payload);

      if (!result?.success) {
        Alert.alert("Error", result?.error || "Failed to update profile");
        return;
      }

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (_error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleNextStep = () => {
    const validationErrors = getValidationErrors({ includeStep2: false });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      showFirstError(validationErrors);
      return;
    }

    setFieldErrors({});
    setEditStep(2);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View
          style={{
            backgroundColor: COLORS.cardBackground,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: COLORS.border,
            padding: 16,
            shadowColor: COLORS.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "700", color: COLORS.textPrimary }}>Edit Profile</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {[1, 2].map((step) => {
              const active = editStep === step;
              return (
                <View
                  key={`step-${step}`}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? COLORS.primary : COLORS.border,
                    backgroundColor: active ? COLORS.primary : COLORS.inputBackground,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.textPrimary, fontWeight: "700", fontSize: 12 }}>
                    Step {step}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={{ color: COLORS.textSecondary, marginBottom: 14, fontWeight: "600" }}>
            {editStep === 1 ? "Step 1: Basic details" : "Step 2: Additional details & password"}
          </Text>

          {editStep === 1 ? (
            <>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <UserAvatar uri={profileImage || user?.profileImage} size={90} borderRadius={45} />
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: COLORS.inputBackground,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                  onPress={pickProfileImage}
                >
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "600" }}>Change Photo</Text>
                </TouchableOpacity>
              </View>

              <InputField
                label="Username"
                icon="person-outline"
                value={username}
                onChangeText={(value) => {
                  setUsername(value);
                  setFieldErrors((current) => ({ ...current, username: "" }));
                }}
                autoCapitalize="none"
                colors={COLORS}
                error={fieldErrors.username}
              />
              <InputField
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setFieldErrors((current) => ({ ...current, email: "" }));
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                colors={COLORS}
                error={fieldErrors.email}
              />

              {user?.role === "tutor" ? (
                <>
                  <InputField
                    label="Full Name"
                    icon="person-circle-outline"
                    value={fullName}
                    onChangeText={(value) => {
                      setFullName(value);
                      setFieldErrors((current) => ({ ...current, fullName: "" }));
                    }}
                    colors={COLORS}
                    error={fieldErrors.fullName}
                  />
                  <InputField
                    label="Subject"
                    icon="book-outline"
                    value={subject}
                    onChangeText={(value) => {
                      setSubject(value);
                      setFieldErrors((current) => ({ ...current, subject: "" }));
                    }}
                    colors={COLORS}
                    error={fieldErrors.subject}
                  />
                  <InputField
                    label="Mobile Number"
                    icon="call-outline"
                    value={mobileNumber}
                    onChangeText={(value) => {
                      setMobileNumber(value);
                      setFieldErrors((current) => ({ ...current, mobileNumber: "" }));
                    }}
                    keyboardType="phone-pad"
                    colors={COLORS}
                    error={fieldErrors.mobileNumber}
                  />

                  <PickerField
                    label="Experience Level"
                    icon="briefcase-outline"
                    selectedValue={experienceLevel}
                    onValueChange={setExperienceLevel}
                    colors={COLORS}
                    items={[
                      { label: "Select Experience Level", value: "" },
                      { label: "Beginner", value: "beginner" },
                      { label: "Intermediate", value: "intermediate" },
                      { label: "Expert", value: "expert" },
                    ]}
                  />

                  <InputField
                    label="Age"
                    icon="calendar-outline"
                    value={age}
                    onChangeText={(value) => {
                      setAge(value);
                      setFieldErrors((current) => ({ ...current, age: "" }));
                    }}
                    keyboardType="number-pad"
                    colors={COLORS}
                    error={fieldErrors.age}
                  />
                  <InputField label="Price" icon="cash-outline" value={price} onChangeText={setPrice} keyboardType="decimal-pad" colors={COLORS} />

                  <PickerField
                    label="Price Type"
                    icon="pricetags-outline"
                    selectedValue={priceType}
                    onValueChange={setPriceType}
                    colors={COLORS}
                    items={[
                      { label: "Select Price Type", value: "" },
                      { label: "Per Session", value: "per_session" },
                    ]}
                  />
                </>
              ) : null}

              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  paddingVertical: 11,
                  alignItems: "center",
                  marginTop: 6,
                }}
                onPress={handleNextStep}
              >
                <Text style={{ color: COLORS.white, fontWeight: "700" }}>Next (Step 2)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {user?.role === "tutor" ? (
                <>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "600", marginBottom: 8 }}>Bio</Text>
                  <TextInput
                    value={bio}
                    onChangeText={(value) => {
                      setBio(value);
                      setFieldErrors((current) => ({ ...current, bio: "" }));
                    }}
                    multiline
                    textAlignVertical="top"
                    style={{
                      backgroundColor: COLORS.inputBackground,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      minHeight: 90,
                      color: COLORS.textPrimary,
                      marginBottom: 10,
                    }}
                  />
                  {fieldErrors.bio ? <Text style={{ color: "#b42318", marginBottom: 8, fontSize: 12 }}>{fieldErrors.bio}</Text> : null}

                  <Text style={{ color: COLORS.textPrimary, fontWeight: "600", marginBottom: 8 }}>Availability</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    {availability.map((slot) => {
                      const selected = slot.isAvailable;
                      return (
                        <TouchableOpacity
                          key={slot.day}
                          onPress={() => toggleAvailabilityDay(slot.day)}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: selected ? COLORS.primary : COLORS.border,
                            backgroundColor: selected ? COLORS.primary : COLORS.inputBackground,
                          }}
                        >
                          <Text style={{ color: selected ? COLORS.white : COLORS.textPrimary, fontWeight: "700", fontSize: 12 }}>
                            {slot.day.slice(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {fieldErrors.availability ? <Text style={{ color: "#b42318", marginBottom: 8, fontSize: 12 }}>{fieldErrors.availability}</Text> : null}

                  {availability.filter((slot) => slot.isAvailable).map((slot) => (
                    <View key={slot.day} style={{ marginBottom: 10 }}>
                      <Text style={{ color: COLORS.textSecondary, marginBottom: 6, fontWeight: "600" }}>{slot.day}</Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <PickerField
                            label="From"
                            icon="time-outline"
                            selectedValue={slot.from}
                            onValueChange={(value) => updateAvailabilityTime(slot.day, "from", value)}
                            colors={COLORS}
                            items={TIME_OPTIONS.map((timeOption) => ({ label: timeOption, value: timeOption }))}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <PickerField
                            label="To"
                            icon="time-outline"
                            selectedValue={slot.to}
                            onValueChange={(value) => updateAvailabilityTime(slot.day, "to", value)}
                            colors={COLORS}
                            items={TIME_OPTIONS.map((timeOption) => ({ label: timeOption, value: timeOption }))}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}

              <InputField
                label="New Password (Optional)"
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setFieldErrors((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
                }}
                secureTextEntry
                colors={COLORS}
                error={fieldErrors.newPassword}
              />

              <InputField
                label="Confirm Password"
                icon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setFieldErrors((current) => ({ ...current, confirmPassword: "" }));
                }}
                secureTextEntry
                colors={COLORS}
                error={fieldErrors.confirmPassword}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 11,
                    alignItems: "center",
                    backgroundColor: COLORS.inputBackground,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                  onPress={() => setEditStep(1)}
                  disabled={isSavingProfile}
                >
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.primary,
                    borderRadius: 10,
                    paddingVertical: 11,
                    alignItems: "center",
                  }}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={{ color: COLORS.white, fontWeight: "700" }}>Save Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
