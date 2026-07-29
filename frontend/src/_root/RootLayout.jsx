import { Outlet } from "react-router";
import Topbar from "@/components/Shared/Topbar";
import Bottombar from "@/components/Shared/Bottombar";
import LeftSidebar from "@/components/Shared/LeftSidebar";

const RootLayout = () => {
  return (
    <div className="w-full h-screen flex flex-col">
      <Topbar />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar className="leftsidebar" />

        <section className="flex-1 overflow-auto custom-scrollbar scroll-smooth">
          <Outlet />
        </section>
      </div>

      <Bottombar />
    </div>
  );
};

export default RootLayout;
