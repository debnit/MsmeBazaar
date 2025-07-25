import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  TouchableOpacity,
} from 'react-native';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  required?: boolean;
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  onFocus,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  required = false,
  showPasswordToggle = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const containerStyle = [
    styles.container,
    style,
  ];

  const inputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    disabled && styles.inputContainerDisabled,
  ];

  const textInputStyle = [
    styles.input,
    multiline && styles.multilineInput,
    disabled && styles.inputDisabled,
    inputStyle,
  ];

  const labelTextStyle = [
    styles.label,
    required && styles.labelRequired,
    error && styles.labelError,
    labelStyle,
  ];

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={labelTextStyle}>
          {label}
          {required && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>
      )}
      
      <View style={inputContainerStyle}>
        <TextInput
          style={textInputStyle}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor="#9ca3af"
        />
        
        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
          >
            <Text style={styles.passwordToggleText}>
              {isPasswordVisible ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  
  labelRequired: {
    // No additional styles needed, asterisk handles this
  },
  
  labelError: {
    color: '#dc2626',
  },
  
  requiredAsterisk: {
    color: '#dc2626',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  
  inputContainerFocused: {
    borderColor: '#2563eb',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
      },
    }),
  },
  
  inputContainerError: {
    borderColor: '#dc2626',
  },
  
  inputContainerDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    minHeight: 40,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  inputDisabled: {
    color: '#6b7280',
  },
  
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  
  passwordToggleText: {
    fontSize: 16,
  },
  
  error: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});

export default Input;