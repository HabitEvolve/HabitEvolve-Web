import { FC } from "react";

interface FileInputProps {
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileInput: FC<FileInputProps> = ({ className, onChange }) => {
  return (
    <input
      type="file"
      className={`h-11 w-full overflow-hidden rounded-sky-chip border border-white/80 bg-white/60 text-sm text-sky-ink-2 transition-colors file:mr-5 file:border-collapse file:cursor-pointer file:rounded-l-sky-chip file:border-0 file:border-r file:border-solid file:border-white/80 file:bg-white/60 file:py-3 file:pl-3.5 file:pr-3 file:text-sm file:text-sky-ink placeholder:text-sky-ink-3 hover:file:bg-white/90 focus:border-sky-deep focus:outline-hidden focus:ring-3 focus:ring-sky-deep/18 ${className}`}
      onChange={onChange}
    />
  );
};

export default FileInput;
