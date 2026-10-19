
export const BASE_URL = 'https://officepanel.webmastersinfo.in/api_production/';

// export const BASE_URL = 'https://officepanel.webmastersinfo.in/dev/';


export const ENDPOINTS = {
    ListProfile: `${BASE_URL}list_profile.php`,
    Login: `${BASE_URL}login.php`,
    Add_member: `${BASE_URL}add_member.php`,
    list_City: `${BASE_URL}list_city.php`,
    list_State: `${BASE_URL}list_state.php`,
    // ⬇️ ये दो नए endpoints डैशबोर्ड के लिए
    AddAttendance: `${BASE_URL}add_attendance.php`,
    ListAttendance: `${BASE_URL}list_attendance.php`,
    // ⬇️ नए endpoints – AddModule के लिए
    ListProject: `${BASE_URL}list_project.php`,
    AddModule: `${BASE_URL}add_module.php`,
    // ⬇️ नए endpoints – AddLeave के लिए
    ListLeaveType: `${BASE_URL}list_leave_type.php`,
    AddLeave: `${BASE_URL}add_leave.php`,

    // ⬇️ AddProfile के लिए नया endpoint
    UpdateProfile: `${BASE_URL}update_profile.php`,

    // ⬇️ AddProject के लिए नया endpoint
    AddProject: `${BASE_URL}add_project.php`,
    updateProject: `${BASE_URL}update_project.php`,
    // ⬇️ AddStaff के लिए नए endpoints
    ListPosition: `${BASE_URL}list_position.php`,
    AddStaff: `${BASE_URL}add_staff.php`,
    // ⬇️ AddTask के लिए नए endpoints
    ListModule: `${BASE_URL}list_module.php`,
    AddTask: `${BASE_URL}add_task.php`,
    ListMember: `${BASE_URL}list_member.php`,
    // ⬇️ Allattendance के लिए नए endpoints
    ListGroupAttendance: `${BASE_URL}list_group_attendance.php`,


    // ⬇️ Leave component के लिए नए endpoints
    ListLeave: `${BASE_URL}list_leave.php`,
    DeleteLeave: `${BASE_URL}delete_leave.php`,
    ChangeLeaveStatus: `${BASE_URL}change_leave_status.php`,


    DeleteModule: `${BASE_URL}delete_module.php`,

    // ⬇️ Change Password के लिए नया endpoint
    ChangePassword: `${BASE_URL}change_password.php`,

    // ⬇️ Project component के लिए नए endpoints
    // ये पहले से हो सकता है
    DeleteProject: `${BASE_URL}delete_project.php`,

    // ⬇️ ProjectDetails के लिए नए endpoints
    ListSingleProjectDetail: `${BASE_URL}list_single_project_detail.php`,
    ChangeProjectStatus: `${BASE_URL}change_project_status.php`,

    // ⬇️ ProjectReport के लिए नया endpoint
    ListProjectName: `${BASE_URL}list_project_name.php`,


    // ⬇️ ProjectTaskList के लिए नए endpoints
    ListTask: `${BASE_URL}list_task.php`,
    ListModuleProjectWise: `${BASE_URL}list_module_project_wise.php`,
    ListTaskModuleWise: `${BASE_URL}list_task_module_wise.php`,

    // ⬇️ Staff component के लिए नए endpoints
    ChangeMemberStatus: `${BASE_URL}change_member_status.php`,

    // ⬇️ StaffDetails के लिए नया endpoint
    DeleteMember: `${BASE_URL}delete_member.php`,

    // ⬇️ Task component के लिए नए endpoints
    UpdateTaskStatus: `${BASE_URL}update_task_status.php`,
    StatusWiseTaskList: `${BASE_URL}status_wise_task_list.php`,

    // ⬇️ TaskDetails के लिए नए endpoints
    SingleTaskList: `${BASE_URL}single_task_list.php`,
    DeleteTask: `${BASE_URL}delete_task.php`,

    UpdateTask: `${BASE_URL}Update_task.php`,

    UpdateLeave: `${BASE_URL}update_leave.php`,
    UpdateModule: `${BASE_URL}update_module.php`,



    //festival apis
    festival_list: `${BASE_URL}festival_list.php`,
    add_festival: `${BASE_URL}add_festival.php`,
    update_festival: `${BASE_URL}update_festival.php`,
    delete_festival: `${BASE_URL}delete_festival.php`,
    change_status_festival: `${BASE_URL}change_status_festival.php`,

    //Birth day 
    list_bithday: `${BASE_URL}list_bithday.php`,
    add_birthday: `${BASE_URL}add_birthday.php`,
    update_birthday: `${BASE_URL}update_birthday.php`,
    delete_bithday: `${BASE_URL}delete_bithday.php`,
    DailyWorkReport: `${BASE_URL}daily_work_report.php`,
    view_attendance_detail: `${BASE_URL}view_attendance_detail.php`,

    reset_device: `${BASE_URL}reset_device.php`,
    reassign_task_api: `${BASE_URL}reassign_task_api.php`,
    task_detail: `${BASE_URL}task_detail.php`,

    list_rules_announce: `${BASE_URL}list_rules_announce.php`,
    update_rules_announce: `${BASE_URL}update_rules_announce.php`,
    list_group_attendance_edit: `${BASE_URL}list_group_attendance_edit.php`,


    ScanTaskImage: `${BASE_URL}scan_task_image.php`,









};