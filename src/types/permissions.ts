export type PermissionKey =
  // 1. Pages & Navigation
  | 'section_calendar'
  | 'section_production'
  | 'section_prep_matrix'
  | 'section_finance'
  | 'section_shipping'
  | 'section_driver'
  | 'section_reports'
  | 'section_access_control'
  // 2. Core Order & Customer Fields
  | 'field_order_code'
  | 'field_delivery_slot'
  | 'field_order_status'
  | 'field_customer_name'
  | 'field_customer_phone'
  | 'field_district'
  | 'field_address'
  | 'field_notes'
  | 'field_call_recording'
  // 3. Items, Weights & Financial Amounts
  | 'field_product_name'
  | 'field_requested_weight'
  | 'field_produced_weight'
  | 'field_revised_weight'
  | 'field_delivered_weight'
  | 'field_returned_weight'
  | 'field_unit_price'
  | 'field_item_total'
  | 'field_order_total'
  // 4. Production Actions
  | 'action_production_weigh'
  | 'action_production_complete'
  | 'action_production_reject'
  // 5. Invoice Issuance (Finance) Actions
  | 'action_finance_approve'
  | 'action_finance_reject'
  | 'action_finance_verify_driver_docs'
  | 'action_finance_reject_driver_docs'
  // 6. Shipping & Return Actions
  | 'field_driver_assignment'
  | 'action_shipping_discrepancy'
  | 'action_shipping_deliver'
  | 'action_shipping_return'
  | 'action_return_confirm'
  // 7. Driver Panel & General Tools
  | 'action_driver_route_priority'
  | 'field_driver_invoice_photo'
  | 'field_driver_receipt_photo'
  | 'action_driver_complete'
  | 'action_print'
  | 'action_reset_data';

export interface FieldPermission {
  view: boolean;
  edit: boolean;
}

export type PermissionMap = Record<PermissionKey, FieldPermission>;

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  id: string;
  title: string;
  description: string;
  items: PermissionDefinition[];
}

export type AccessPresetId =
  | 'admin_full'
  | 'production_operator'
  | 'finance_specialist'
  | 'shipping_coordinator'
  | 'driver_role'
  | 'read_only_viewer';

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  isSystemGroup?: boolean;
  permissions: PermissionMap;
}

export interface AppUser {
  id: string;
  fullName: string;
  roleTitle: string;
  phone: string;
  groupId: string;
  isSystemAdmin?: boolean;
}

export interface AccessControlHelpers {
  canView: (key: PermissionKey) => boolean;
  canEdit: (key: PermissionKey) => boolean;
}
