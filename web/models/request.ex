defmodule Perf.Request do
  use Perf.Web, :model

  schema "requests" do
    field :method
    field :verified, :boolean
    field :path
    field :params, :map
    field :body, :string, default: ""
    field :headers, :map
    
    field :min_concurrency, :integer
    field :max_concurrency, :integer
    field :step_size, :integer
    field :step_duration, :integer

    field :timeout, :integer, default: 2_000
    field :receive_timeout, :integer, default: 2_000
    field :view, :map
    belongs_to :suite, Perf.Suite

    timestamps()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:suite_id, :method, :path, :params, :body, :headers, :min_concurrency, :max_concurrency, :step_size, :step_duration, :timeout, :receive_timeout, :view])
    |> validate_required([:method, :path, :params, :headers, :min_concurrency, :max_concurrency, :step_size, :step_duration])
    |> validate_number(:min_concurrency, greater_than: 0, less_than: 10_000)
    |> validate_number(:max_concurrency, greater_than: 0, less_than: 10_000)
    |> validate_number(:step_size, greater_than: 0, less_than: 10_000)
    |> validate_number(:step_duration, greater_than: 0, less_than: 20 * 60 * 1000)
    |> validate_number(:timeout, greater_than: 50, less_than: 30_000)
    |> validate_number(:receive_timeout, greater_than: 50, less_than: 5 * 60_000)
  end

  defimpl Poison.Encoder, for: Perf.Request do
    @attributes [:id, :suite_id, 
    :method, :path, 
    :body, :params, :body, 
    :headers, :min_concurrency, 
    :max_concurrency, :step_size, 
    :step_duration, :timeout, :receive_timeout, :view]

    def encode(request, _options) do
      request
      |> Map.take(@attributes)
      |> Poison.encode!
    end
  end
end