defmodule Perf.Suite do
  use Perf.Web, :model

  defmodule Request do
    use Ecto.Schema

    embedded_schema do
      field :method
      field :verified, :boolean
      field :path
      field :params, :map
      field :body
      field :headers, :map
      field :concurrency, :integer
      field :runlength, :integer
      field :timeout, :integer
      field :receive_timeout, :integer
      field :view, :map
    end
  end

  schema "suites" do
    field :name, :string
    field :description, :string
    field :trigger, :map, default: %{}
    embeds_many :requests, Request
    belongs_to :user, Perf.User

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:name, :trigger, :user_id])
    |> validate_required([:name, :trigger, :user_id])
  end

  defimpl Poison.Encoder, for: Perf.Suite do
    @attributes ~W(id name description trigger requests belongs_to inserted_at updated_at)a

    def encode(suite, _options) do
      suite
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end
