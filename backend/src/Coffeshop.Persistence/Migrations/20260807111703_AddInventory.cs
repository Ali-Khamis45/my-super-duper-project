using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Coffeshop.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "inventory_items",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ingredient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stock_level = table.Column<int>(type: "integer", nullable: false),
                    reserved_quantity = table.Column<int>(type: "integer", nullable: false),
                    low_stock_threshold = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: true),
                    modified_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    modified_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "inventory_reservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    inventory_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ingredient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    closed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: true),
                    modified_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    modified_by = table.Column<string>(type: "text", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_reservations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "inventory_transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    inventory_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    ingredient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quantity_delta = table.Column<int>(type: "integer", nullable: false),
                    balance_after = table.Column<int>(type: "integer", nullable: false),
                    order_id = table.Column<Guid>(type: "uuid", nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    occurred_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventory_transactions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_items_ingredient_id",
                table: "inventory_items",
                column: "ingredient_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inventory_items_status",
                table: "inventory_items",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_reservations_inventory_item_id_status_expires_at_~",
                table: "inventory_reservations",
                columns: new[] { "inventory_item_id", "status", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_inventory_reservations_order_id",
                table: "inventory_reservations",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_reservations_status",
                table: "inventory_reservations",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_inventory_item_id",
                table: "inventory_transactions",
                column: "inventory_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_occurred_at_utc",
                table: "inventory_transactions",
                column: "occurred_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_inventory_transactions_order_id",
                table: "inventory_transactions",
                column: "order_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "inventory_items");

            migrationBuilder.DropTable(
                name: "inventory_reservations");

            migrationBuilder.DropTable(
                name: "inventory_transactions");
        }
    }
}
