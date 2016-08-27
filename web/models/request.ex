defmodule Perf.Request do
  use Perf.Web, :model

  schema "requests" do
    field :method
    field :verified, :boolean
    field :path
    field :params, :map
    field :body, :string, default: ""
    field :headers, :map
    field :concurrency, :integer
    field :runlength, :integer
    field :timeout, :integer, default: 2_000
    field :receive_timeout, :integer, default: 2_000
    field :view, :map
    belongs_to :suite, Perf.Suite

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:suite_id, :method, :path, :params, :body, :headers, :concurrency, :runlength, :timeout, :receive_timeout, :view])
    |> validate_required([:method, :path, :params, :headers, :concurrency, :runlength])
    |> validate_number(:concurrency, greater_than: 0, less_than: 10_000)
    |> validate_number(:runlength, greater_than: 0, less_than: (60 * 30))
    |> validate_number(:timeout, greater_than: 50, less_than: 30_000)
    |> validate_number(:receive_timeout, greater_than: 50, less_than: 5 * 60_000)
  end

  defimpl Poison.Encoder, for: Perf.Request do
    @attributes [:id, :suite_id, :method, :path, :body, :params, :body, :headers, :concurrency, :runlength, :timeout, :receive_timeout, :view]

    def encode(suite, _options) do
      suite
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end