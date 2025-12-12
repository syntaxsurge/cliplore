import SidebarButton from "./SidebarButton";
import { Keyboard } from "lucide-react";

export default function ShortcutsButton({
  onClick,
  active = false,
}: {
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <SidebarButton
      label="Shortcuts"
      icon={<Keyboard className="h-6 w-6" />}
      onClick={onClick}
      active={active}
    />
  );
}
