import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Layers, ShieldCheck, Zap, BookOpen, Puzzle, LayoutList } from "lucide-react";
import AdminMainAccounts from "./AdminMainAccounts";
import AdminSubAccounts from "./AdminSubAccounts";
import AdminUsers from "./AdminUsers";
import AdminAIActions from "./AdminAIActions";
import AdminInstructionBlocks from "./AdminInstructionBlocks";
import AdminCopyComponents from "./AdminCopyComponents";
import AdminCopyFrameworks from "./AdminCopyFrameworks";

interface AdminPanelProps {
  category?: "accounts" | "ai" | "copy";
}

const categoryConfig = {
  accounts: {
    title: "Accounts",
    description: "Manage all accounts, workspaces, and users across the platform.",
    defaultTab: "main-accounts",
    tabs: [
      { value: "main-accounts", label: "Main Accounts", icon: Building2, content: <AdminMainAccounts /> },
      { value: "sub-accounts", label: "Sub Accounts", icon: Layers, content: <AdminSubAccounts /> },
      { value: "users", label: "Users", icon: Users, content: <AdminUsers /> },
    ],
  },
  ai: {
    title: "AI",
    description: "Manage AI actions, prompts, and instruction blocks.",
    defaultTab: "ai-actions",
    tabs: [
      { value: "ai-actions", label: "AI Actions", icon: Zap, content: <AdminAIActions /> },
      { value: "instruction-blocks", label: "Instruction Blocks", icon: BookOpen, content: <AdminInstructionBlocks /> },
    ],
  },
  copy: {
    title: "Copy",
    description: "Manage copy components and frameworks.",
    defaultTab: "copy-components",
    tabs: [
      { value: "copy-components", label: "Components", icon: Puzzle, content: <AdminCopyComponents /> },
      { value: "copy-frameworks", label: "Frameworks", icon: LayoutList, content: <AdminCopyFrameworks /> },
    ],
  },
};

const AdminPanel = ({ category = "accounts" }: AdminPanelProps) => {
  const config = categoryConfig[category];
  const [activeTab, setActiveTab] = useState(config.defaultTab);

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Admin — {config.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{config.description}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {config.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {config.tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminPanel;
