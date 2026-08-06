import React from "react";

interface TextareaProps {
  placeholder?: string; // Placeholder text
  rows?: number; // Number of rows
  value?: string; // Current value
  onChange?: (value: string) => void; // Change handler
  className?: string; // Additional CSS classes
  disabled?: boolean; // Disabled state
  error?: boolean; // Error state
  hint?: string; // Hint text to display
}

const TextArea: React.FC<TextareaProps> = ({
  placeholder = "Enter your message", // Default placeholder
  rows = 3, // Default number of rows
  value = "", // Default value
  onChange, // Callback for changes
  className = "", // Additional custom styles
  disabled = false, // Disabled state
  error = false, // Error state
  hint = "", // Default hint text
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  let textareaClasses = `w-full rounded-sky-chip border px-4 py-2.5 text-sm transition placeholder:text-sky-ink-3 focus:outline-hidden ${className} `;

  if (disabled) {
    textareaClasses += ` bg-sky-ink/5 opacity-50 text-sky-ink-3 border-sky-ink/12 cursor-not-allowed`;
  } else if (error) {
    textareaClasses += ` bg-white/60 text-sky-ink border-sky-rose focus:border-sky-rose focus:ring-3 focus:ring-sky-rose/20`;
  } else {
    textareaClasses += ` bg-white/60 text-sky-ink border-white/80 focus:border-sky-deep focus:ring-3 focus:ring-sky-deep/18`;
  }

  return (
    <div className="relative">
      <textarea
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={textareaClasses}
      />
      {hint && (
        <p
          className={`mt-2 text-sm ${
            error ? "text-sky-rose-deep" : "text-sky-ink-2"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
