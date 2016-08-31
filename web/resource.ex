defmodule Perf.Resource do
  defmodule State do
    defstruct params: nil,
      conn: nil,
      socket: nil,
      resp: nil,
      error: nil,
      query: nil,
      model: nil,
      kind: :ok
  end

  defmodule Error do
    defstruct reason: :none,
      params: %{},
      english: ""
  end

  defmacro __before_compile__(env) do
    stages = Module.get_attribute(env.module, :stages)
    compile_stages(env, stages)
  end

  defmacro on(params, body) do
    {_, _, args} = params
    wanted = args
    |> Enum.map(fn {key, _} -> key end)

    quote do
      def handle(var!(model), %State{params: unquote(params)} = var!(state)) do
        unquote(body[:do])
      end

      def handle(model, state) do
        required = MapSet.new(unquote(wanted))
        given = state.params
        |> Map.keys
        |> MapSet.new

        omitted = MapSet.difference(required, given) |> Enum.into([])
        extras = MapSet.difference(given, required) |> Enum.into([])

        missing_params(state, omitted, extras)
      end
    end
  end


  defmacro __using__(_opts) do
    quote do
      import Perf.Resource
      alias Perf.{Repo, User, Session}
      import Ecto.Query
      alias Perf.Resource.State
      alias Perf.Resource.Error

      def handle(model, state) do
        stage_builder(model, state)
      end

      Module.register_attribute(__MODULE__, :stages, accumulate: true)
      @before_compile Perf.Resource
      defoverridable [handle: 2]
    end
  end

  defmacro stage(stage, opts \\ []) do
    quote do
      @stages {unquote(stage), unquote(opts)}
    end
  end

  def compile_stages(_env, stages) do
    resolved = stages
    quote do
      defp stage_builder(model, state) do
        unquote(resolved)
        |> Enum.reverse
        |> Enum.reduce(state, fn
          {stage, args}, %State{error: nil} = state ->
            {module, args} = Keyword.pop(args, :mod, __MODULE__)
            apply(module, stage, args ++ [model, state])
          _, state ->
            state
        end)
      end
    end
  end


  def created(state, resp, params \\ %{}) do
    struct(
      state,
      kind: :created,
      resp: resp,
      params: params
    )
  end

  def forbidden(state) do
    struct(
      state,
      kind: :forbidden,
      error: %Error{
        reason: "session_required",
        english: "You need to be logged in to do that"
      }
    )
  end

  def missing_params(state, omitted, extras) do
    bad_request(state, %Error{
      english:  "I didn't see #{Enum.join(omitted, ",")} and saw #{Enum.join(extras, ",")} which I didn't expect",
      reason: "field_set_invalid",
      params: %{
        "extras" => extras,
        "omitted" => omitted
      }
    })
  end

  def value_error(state, %Ecto.Changeset{valid?: false} = cset) do
    field_errors = Perf.ErrorHelpers.format(cset)
    value_error(state, field_errors)
  end

  def value_error(state, field_errors) do
    formatted = field_errors
    |> Enum.map(fn {k, v} -> "#{k}: #{Enum.join(v, "; ")}" end)
    |> Enum.join(",")

    bad_request(state, %{
      reason: :field_values_invalid,
      english: "Error! #{formatted}",
      params: %{
        field_errors: field_errors
      }
    })
  end

  def resource_error(state, verb, name) do
    bad_request(state, %{
      reason: :invalid_resource_action,
      english: "#{verb} action is not allowed on #{name}",
      params: %{}
    })
  end

  def bad_request(state, resp) do
    struct(
      state,
      kind: :bad_request,
      error: resp
    )
  end

  def not_found(state, details) do
    struct(
      state,
      kind: :not_found,
      error: %Error{
        reason: "not_found",
        english: "That item was not found: #{details}",
        params: %{
          details: details
        }
      }
    )
  end

  def internal_error(state, reason) do
    struct(
      state,
      kind: :internal_error,
      error: %{
        english: "An unknown error occurred: #{reason}",
        params: %{
          reason: reason
        }
      }
    )
  end

  def ok(state, resp) do
    struct(
      state,
      kind: :ok,
      resp: resp
    )
  end
end

defprotocol Perf.Resource.Create do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Read do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Update do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.Delete do
  @fallback_to_any true
  def handle(model, state)
end

defprotocol Perf.Resource.List do
  @fallback_to_any true
  def handle(model, state)
end
