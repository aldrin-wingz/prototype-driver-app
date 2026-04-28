/** Action type for announcement buttons */
export interface AnnouncementAction {
  label: string;
  type: "dismiss" | "url";
  url?: string;
}
