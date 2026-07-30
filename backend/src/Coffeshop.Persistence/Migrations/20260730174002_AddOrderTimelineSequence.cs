using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Coffeshop.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderTimelineSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "sequence",
                table: "order_timeline_entries",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "sequence",
                table: "order_timeline_entries");
        }
    }
}
