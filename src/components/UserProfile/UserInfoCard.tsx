import { Pencil } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const eyebrow = "text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-ink-3";

// A read-only fact sits in its own shallow well so the value reads as data the
// user is looking at, not a field they can type into.
const Fact = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-sky-md bg-white/55 ring-1 ring-white/75 px-4 py-3">
    <p className={`${eyebrow} mb-1`}>{label}</p>
    <p className="text-sm font-semibold text-sky-ink">{value}</p>
  </div>
);

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };
  return (
    <div className="sky-glass-admin rounded-sky-card p-5 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-lg font-semibold text-sky-ink tracking-[-0.01em] mb-4 lg:mb-5">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
            <Fact label="First Name" value="Musharof" />
            <Fact label="Last Name" value="Chowdhury" />
            <Fact label="Email address" value="randomuser@pimjo.com" />
            <Fact label="Phone" value="+09 363 398 46" />
            <Fact label="Bio" value="Team Manager" />
          </div>
        </div>

        <button
          onClick={openModal}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-sky-chip bg-white/70 px-4 py-2.5 text-sm font-semibold text-sky-ink-2 ring-1 ring-white/85 shadow-sky-chip transition hover:bg-white/90 hover:text-sky-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-deep/45 lg:inline-flex lg:w-auto"
        >
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          Edit
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto p-5 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-1.5 font-display text-2xl font-semibold text-sky-ink tracking-[-0.01em]">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm font-medium text-sky-ink-2 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <p className={`${eyebrow} mb-4`}>Social Links</p>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Facebook</Label>
                    <Input
                      type="text"
                      value="https://www.facebook.com/PimjoHQ"
                    />
                  </div>

                  <div>
                    <Label>X.com</Label>
                    <Input type="text" value="https://x.com/PimjoHQ" />
                  </div>

                  <div>
                    <Label>Linkedin</Label>
                    <Input
                      type="text"
                      value="https://www.linkedin.com/company/pimjo"
                    />
                  </div>

                  <div>
                    <Label>Instagram</Label>
                    <Input type="text" value="https://instagram.com/PimjoHQ" />
                  </div>
                </div>
              </div>
              <div className="mt-7">
                <p className={`${eyebrow} mb-4`}>Personal Information</p>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input type="text" value="Musharof" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input type="text" value="Chowdhury" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input type="text" value="randomuser@pimjo.com" />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input type="text" value="+09 363 398 46" />
                  </div>

                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input type="text" value="Team Manager" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
