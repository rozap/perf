defmodule Perf.Suite do
  use Perf.Web, :model

  schema "suites" do
    field :name, :string
    field :description, :string
    field :trigger, :map
    belongs_to :user, Perf.User

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :trigger])
    |> validate_required([:name, :trigger, :user_id])
  end

  defimpl Poison.Encoder, for: Perf.Suite do
    @attributes ~W(id name description belongs_to inserted_at updated_at)a

    def encode(suite, _options) do
      suite
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
