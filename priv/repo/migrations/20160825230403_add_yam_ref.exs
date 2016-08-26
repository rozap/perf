defmodule Perf.Repo.Migrations.AddYamRef do
  use Ecto.Migration

  def change do
    alter table(:runs) do
      add :yam_ref, :string
    end
  end
end
