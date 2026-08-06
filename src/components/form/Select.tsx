import { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}) => {
  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    onChange(value); // Trigger parent handler
  };

  return (
    <select
      className={`h-11 w-full appearance-none rounded-sky-chip border border-white/80 bg-white/60 px-4 py-2.5 pr-11 text-sm transition placeholder:text-sky-ink-3 focus:border-sky-deep focus:outline-hidden focus:ring-3 focus:ring-sky-deep/18 ${
        selectedValue ? "text-sky-ink" : "text-sky-ink-3"
      } ${className}`}
      value={selectedValue}
      onChange={handleChange}
    >
      {/* Placeholder option */}
      <option value="" disabled className="text-sky-ink-2">
        {placeholder}
      </option>
      {/* Map over options */}
      {options.map((option) => (
        <option key={option.value} value={option.value} className="text-sky-ink">
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
